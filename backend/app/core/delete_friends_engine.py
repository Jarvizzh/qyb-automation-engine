# -*- coding: utf-8 -*-
import json
import time
import random
import traceback
import datetime
import websocket
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
from .miaokol_client_adapter import get_miaokol_client

def run_delete_friends_task(task_id: str, mobile: str, corp_name: str, zombie_type: str, tag_name: str, log_queue, stop_event):
    def log(msg):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        full_msg = f"[{timestamp}] {msg}"
        log_queue.put(full_msg)

    # 1. 强制安全阻断防御：禁止删除活跃正常的好友类型 (1) 或者是 0
    if str(zombie_type) in ("1", "0"):
        log("❌ 安全熔断异常: 系统绝对禁止对正常活跃关系客户 (zombie_type=1) 执行删除操作！")
        log_queue.put(None)
        return

    log(f"🚀 清理客户任务启动, 任务ID: {task_id}")
    zombie_name = "已拉黑客户" if zombie_type == "2" else "已流失客户" if zombie_type == "3" else f"僵尸类型 {zombie_type}"
    log(f"📋 任务参数: 企业简称={corp_name}, 清理类型={zombie_name}, 过滤标签={tag_name or '全部'}")
    log("--------------------------------------------------")

    db = SessionLocal()
    session_id = None
    uid = None
    
    try:
        # 2. 从数据库拉取账号会话
        user = db.query(models.UserSession).filter(models.UserSession.mobile == mobile).first()
        if not user:
            log("❌ 异常: 数据库中未找到该账号的授权会话信息。")
            return
            
        # 3. 验证 Session 活性并使用存储的密码执行静默授权更新
        from .scheduler import is_session_active
        from .qyb_client import login_qyb
        
        log("🔍 正在验证企微宝授权状态...")
        if not is_session_active(user.session_id):
            if user.password:
                log("🔄 授权已过期，正在尝试使用保存的密码进行静默重新登录授权...")
                try:
                    new_cookie, new_uid = login_qyb(user.mobile, user.password)
                    user.session_id = new_cookie
                    if new_uid:
                        user.uid = new_uid
                    user.updated_at = datetime.datetime.now()
                    db.commit()
                    log("✅ 企微宝自动登录重新授权成功，Cookie 刷新成功！")
                except Exception as login_err:
                    log(f"❌ 自动重登授权失败: {str(login_err)}")
                    return
            else:
                log("❌ 授权已过期，且该账号未提供登录密码，无法进行静默重登。执行终止。")
                return
        else:
            log("✅ 授权状态有效，开始与企微宝进行通信...")
            
        session_id = user.session_id
        uid = user.uid
        
    except Exception as session_err:
        log(f"❌ 解析授权环境异常: {str(session_err)}")
        return
    finally:
        db.close()

    try:
        client = get_miaokol_client(session_id)
        
        # 4. 解析企业 ID
        log(f"🏢 正在获取授权企业列表并检索企业简称【{corp_name}】...")
        corps = client.get_corps()
        target_corp = None
        for c in corps:
            if str(c.get('id')) == str(corp_name) or c.get('short_name') == corp_name or c.get('name') == corp_name:
                target_corp = c
                break
                
        if not target_corp:
            log(f"❌ 未找到匹配的企业，已停止。可用企业包括: {[c.get('short_name') or c.get('name') for c in corps]}")
            return
            
        corp_id = target_corp['id']
        corp_short_name = target_corp.get('short_name') or target_corp.get('name')
        log(f"✅ 解析成功，目标企业 ID: {corp_id} ({corp_short_name})")
        
        # 5. 解析标签 ID (可选)
        tag_id = None
        if tag_name:
            log(f"🏷️ 正在查询企业标签【{tag_name}】的 ID...")
            try:
                tag_groups = client.get_corp_tags(corp_id)
                for group in tag_groups:
                    for tag in group.get('tags', []):
                        if tag.get('wx_name') == tag_name:
                            tag_id = tag.get('wxid')
                            break
                    if tag_id:
                        break
                if not tag_id:
                    log(f"⚠️ 警告: 在该企业的标签库中未发现名为【{tag_name}】的标签，将不执行标签过滤。")
                else:
                    log(f"✅ 成功找到标签 ID: {tag_id}")
            except Exception as e:
                log(f"⚠️ 拉取企业标签失败: {str(e)}，将跳过标签过滤。")

        # 6. 分页查询并自动删除 (分页处理)
        total_deleted = 0
        
        def update_db_stats(deleted_cnt):
            db_s = SessionLocal()
            try:
                rec = db_s.query(models.TaskRecord).filter(models.TaskRecord.id == task_id).first()
                if rec:
                    rec.stats = {"total": 0, "sent": deleted_cnt, "failed": 0}
                    db_s.commit()
            except Exception as db_e:
                print(f"Error updating task stats: {db_e}")
            finally:
                db_s.close()

        log("--------------------------------------------------")
        log("🔍 开始循环拉取并执行清理操作...")
        
        while True:
            if stop_event.is_set():
                log("🛑 收到用户停止指令，正在退出清理...")
                break
                
            # 构建过滤参数，强制限制 zombie_type，只允许 2 或 3
            include_params = {
                "corp_id": corp_id,
                "zombie_type": str(zombie_type)
            }
            
            if tag_id:
                include_params["corp_tag"] = {
                    "match_type": "1",
                    "ids": [tag_id]
                }
                
            payload = {
                "page": 1, # 由于删除之后后续数据会前移，我们始终拉取第一页最新数据
                "page_size": 100,
                "include_params": include_params,
                "exclude_params": {}
            }
            
            try:
                res_data = client.fetch_api("/api/contact/search", method="POST", data=payload)
                friends = res_data.get('data', [])
            except Exception as search_err:
                log(f"❌ 查询待清理好友失败: {str(search_err)}")
                break
                
            if not friends:
                log("🏁 未发现更多符合待清理条件的好友，任务已完成。")
                break
                
            log(f"📋 本次成功扫描到 {len(friends)} 位待清理用户，正在拉起 WebSocket 连接...")
            
            # 分批建立 WS 连接以避免单一连接过久超时
            BATCH_SIZE = 30
            for i in range(0, len(friends), BATCH_SIZE):
                if stop_event.is_set():
                    break
                    
                batch = friends[i : i + BATCH_SIZE]
                
                # 获取动态 WS URL
                try:
                    ws_res = client.fetch_api("/api/config/ws")
                    ws_url = ws_res["data"]["url"]
                except Exception as ws_err:
                    log(f"❌ 动态 WS 地址解析失败: {str(ws_err)}")
                    break
                    
                try:
                    # 建立长连接
                    ws = websocket.create_connection(
                        ws_url, 
                        header=["Origin: https://tool.miaokol.com", f"Cookie: PHPSESSID={session_id}"],
                        timeout=10
                    )
                except Exception as conn_err:
                    log(f"❌ 建立 WebSocket 连接失败: {str(conn_err)}，将在 5 秒后重试...")
                    time.sleep(5)
                    break
                    
                try:
                    for friend in batch:
                        if stop_event.is_set():
                            break
                            
                        nickname = friend.get('nickname', '未知')
                        wxid = friend.get('wxid')
                        rel_wxid = friend.get('rel_wxid') # 归属员工
                        
                        if not rel_wxid:
                            log(f"⚠️ 好友【{nickname}】({wxid}) 缺少 rel_wxid 字段，已跳过。")
                            continue
                            
                        log(f"🗑️ [清理中] 好友: 【{nickname}】 (WXID: {wxid}, 归属客服: {rel_wxid})")
                        
                        # 发送删除 WS 指令
                        ws_payload = {
                            "action": "deleteFan",
                            "data": {
                                "wxid": wxid,
                                "corp_wxid": friend.get('corp_wxid')
                            },
                            "router": {
                                "client": "wechat",
                                "uid": str(uid),
                                "wxid": rel_wxid
                            }
                        }
                        ws.send(json.dumps(ws_payload))
                        
                        total_deleted += 1
                        update_db_stats(total_deleted)
                        
                        # 适当的频控保护防封
                        time.sleep(random.uniform(0.8, 1.5))
                        
                except Exception as ws_send_err:
                    log(f"❌ 批次删除发生异常: {str(ws_send_err)}")
                finally:
                    ws.close()
                    
            # 批次之间的短暂休整
            time.sleep(2)
            
        log("--------------------------------------------------")
        log(f"🏁 任务执行结束！累计彻底清理客户: {total_deleted} 名")

    except Exception as e:
        log(f"❌ 任务运行全局故障异常: {str(e)}\n{traceback.format_exc()}")
    finally:
        log_queue.put(None) # 结束信号
        
        # 最终更新 Task 状态
        db = SessionLocal()
        try:
            task_rec = db.query(models.TaskRecord).filter(models.TaskRecord.id == task_id).first()
            if task_rec:
                if stop_event.is_set():
                    task_rec.status = "stopped"
                else:
                    task_rec.status = "completed"
                task_rec.completed_at = datetime.datetime.now()
                db.commit()
        except Exception as db_err:
            print(f"Error finalizing task record: {db_err}")
        finally:
            db.close()
