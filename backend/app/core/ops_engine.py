import json
import time
import random
import traceback
import datetime
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
from .miaokol_client_adapter import get_miaokol_client

def run_groupsend_ops_task(task_id: str, task_type: str, session_id: str, params: dict, log_queue, stop_event):
    def log(msg):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        full_msg = f"[{timestamp}] {msg}"
        log_queue.put(full_msg)

    try:
        module = int(params.get("module", 19))
        group_id_str = str(params.get("group_id", "ALL"))
        task_id_str = str(params.get("task_id", "ALL"))
        style = params.get("style", "Default")
        
        module_name = "极速群发" if module == 19 else "高级群发"
        task_type_name = "标题/封面自动随机更换" if task_type == "title_randomize" else "链接替换"
        
        log(f"🚀 任务 {task_id} 启动: {task_type_name}")
        log(f"📋 参数: 模式={module_name}, 分组={group_id_str}, 任务={task_id_str}, 风格={style}")
        if task_type == "url_replacement":
            cur_url = params.get("cur_url", "")
            new_url = params.get("new_url", "")
            log(f"🔗 链接: 源={cur_url} -> 新={new_url}")
            
        log("------------------------------------------")
        log("🔍 正在拉取企微宝配置并解析目标任务...")
        
        client = get_miaokol_client(session_id)
        
        # 1. 解析目标分组和任务
        target_tasks = [] # list of dicts: {"group_id": int, "group_name": str, "task_id": int, "task_title": str}
        
        # 获取所有分组以解析分组名
        all_groups = []
        try:
            all_groups = client.get_groups(module)
        except Exception as e:
            log(f"⚠️ 获取分组列表失败: {str(e)}")
            
        group_map = {str(g["id"]): g["name"] for g in all_groups}
        
        if group_id_str == "ALL":
            # 获取所有分组下的所有任务
            log("📁 [分组选择 ALL] 开始拉取所有分组的任务列表...")
            for g in all_groups:
                if stop_event.is_set():
                    break
                g_id = g["id"]
                g_name = g["name"]
                try:
                    tasks_in_g = client.get_tasks_in_group(module, g_id)
                    for t in tasks_in_g:
                        target_tasks.append({
                            "group_id": g_id,
                            "group_name": g_name,
                            "task_id": t["id"],
                            "task_title": t.get("title") or t.get("name") or "未命名任务"
                        })
                except Exception as e:
                    log(f"⚠️ 拉取分组【{g_name}】的任务失败: {str(e)}")
        else:
            # 单个分组
            g_name = group_map.get(group_id_str, f"分组ID:{group_id_str}")
            g_id = int(group_id_str)
            if task_id_str == "ALL":
                log(f"📁 [任务选择 ALL] 开始拉取分组【{g_name}】下的所有任务...")
                try:
                    tasks_in_g = client.get_tasks_in_group(module, g_id)
                    for t in tasks_in_g:
                        target_tasks.append({
                            "group_id": g_id,
                            "group_name": g_name,
                            "task_id": t["id"],
                            "task_title": t.get("title") or t.get("name") or "未命名任务"
                        })
                except Exception as e:
                    log(f"⚠️ 拉取分组【{g_name}】的任务失败: {str(e)}")
            else:
                # 单个任务
                t_id = int(task_id_str)
                try:
                    t_detail = client.get_task_detail(module, t_id)
                    t_title = t_detail.get("title") or t_detail.get("name") or "未命名任务"
                    target_tasks.append({
                        "group_id": g_id,
                        "group_name": g_name,
                        "task_id": t_id,
                        "task_title": t_title
                    })
                except Exception as e:
                    log(f"⚠️ 获取任务详情失败 (任务ID: {t_id}): {str(e)}")
                    
        total_targets = len(target_tasks)
        log(f"📊 解析完成，待处理的目标任务共计 {total_targets} 个")
        log("------------------------------------------")
        
        if total_targets == 0:
            log("⚠️ 未匹配到任何可操作的群发任务，执行结束。")
            return
            
        # 2. 执行操作
        success_count = 0
        fail_count = 0
        
        for idx, target in enumerate(target_tasks):
            if stop_event.is_set():
                log("🛑 用户强行停止任务执行")
                break
                
            g_id = target["group_id"]
            g_name = target["group_name"]
            t_id = target["task_id"]
            t_title = target["task_title"]
            
            log(f"🔄 [{idx+1}/{total_targets}] 正在处理任务: 【{t_title}】(分组: {g_name})")
            
            try:
                if task_type == "title_randomize":
                    # 标题/封面自动随机更换
                    client.update_task(
                        module=module,
                        group_id=g_id,
                        task_id=t_id,
                        indices="ALL",
                        updates=None,
                        auto_update=True,
                        style=style
                    )
                    log(f"   ✅ 【{t_title}】随机更换标题与封面成功")
                    success_count += 1
                elif task_type == "url_replacement":
                    # 链接替换
                    cur_url = params.get("cur_url", "")
                    new_url = params.get("new_url", "")
                    url_style = params.get("style", "Original")
                    
                    auto_update = (url_style != "Original")
                    resolved_style = url_style if auto_update else "Default"
                    
                    replaced = client.replace_url_in_task(
                        module=module,
                        group_id=g_id,
                        task_id=t_id,
                        cur_url=cur_url,
                        new_url=new_url,
                        auto_update=auto_update,
                        style=resolved_style
                    )
                    if replaced:
                        log(f"   ✅ 【{t_title}】网页链接替换成功")
                        success_count += 1
                    else:
                        log(f"   ℹ️ 【{t_title}】中未找到匹配的源链接，已跳过")
                        success_count += 1
                else:
                    log(f"   ❌ 未知的运营任务类型: {task_type}")
                    fail_count += 1
                    
            except Exception as item_err:
                log(f"   ❌ 任务【{t_title}】处理失败: {str(item_err)}")
                fail_count += 1
                
            # 稍作延时，安全防封/防限流
            if idx < total_targets - 1:
                time.sleep(1.0 + random.random() * 0.5)
                
        log("------------------------------------------")
        log(f"🏁 任务执行结束。成功: {success_count}，失败: {fail_count}")
        
    except Exception as e:
        log(f"❌ 任务运行发生全局异常: {str(e)}\n{traceback.format_exc()}")
    finally:
        log_queue.put(None) # 结束信号
        # 更新数据库状态
        db = SessionLocal()
        try:
            task_rec = db.query(models.TaskRecord).filter(models.TaskRecord.id == task_id).first()
            if task_rec:
                if stop_event.is_set():
                    task_rec.status = "stopped"
                else:
                    task_rec.status = "completed"
                task_rec.completed_at = datetime.datetime.utcnow()
                db.commit()
        except Exception as db_err:
            print(f"Error updating task status in background: {db_err}")
        finally:
            db.close()
