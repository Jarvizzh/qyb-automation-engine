# -*- coding: utf-8 -*-
import time
import datetime
import threading
import uuid
import os
import requests
from ..database import SessionLocal
from .. import models
from .qyb_client import BASE_URL, HEADERS, login_qyb

def is_session_active(session_id: str) -> bool:
    if not session_id:
        return False
    api_url = f"{BASE_URL}/api/user/authInfo"
    try:
        response = requests.get(api_url, cookies={'PHPSESSID': session_id}, headers=HEADERS, timeout=5)
        if response.status_code == 200:
            res_data = response.json()
            return res_data.get('errcode') == 0
    except Exception:
        pass
    return False

def calculate_next_run(recurrence: str, run_time: str, interval_value: int, interval_unit: str, current_time=None):
    if not current_time:
        current_time = datetime.datetime.now()
        
    if recurrence == "once":
        if not run_time:
            return current_time
        if isinstance(run_time, str):
            try:
                return datetime.datetime.fromisoformat(run_time)
            except:
                try:
                    return datetime.datetime.strptime(run_time, "%Y-%m-%d %H:%M:%S")
                except:
                    return current_time
        return run_time
        
    elif recurrence == "daily":
        if not run_time:
            run_time = "12:00"
        try:
            hour, minute = map(int, run_time.split(":"))
        except:
            hour, minute = 12, 0
            
        now_local = current_time
        target_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        # If target time is past or equal today, schedule for tomorrow
        if target_local <= now_local:
            target_local += datetime.timedelta(days=1)
            
        return target_local
        
    elif recurrence == "interval":
        val = interval_value if (interval_value and interval_value > 0) else 1
        unit = interval_unit or "hours"
        
        if unit == "minutes":
            return current_time + datetime.timedelta(minutes=val)
        elif unit == "hours":
            return current_time + datetime.timedelta(hours=val)
        elif unit == "days":
            return current_time + datetime.timedelta(days=val)
            
    return None

def scheduler_loop():
    print("⏰ [Scheduler] Background thread started successfully.")
    while True:
        try:
            db = SessionLocal()
            now_local = datetime.datetime.now()
            
            # Find active tasks whose schedule is due
            due_tasks = db.query(models.ScheduledTask).filter(
                models.ScheduledTask.status == "active",
                models.ScheduledTask.next_run_at <= now_local
            ).all()
            
            for task in due_tasks:
                execution_task_id = str(uuid.uuid4())
                task_type_str = "标题/封面随机更换" if task.task_type == "title_randomize" else "链接替换"
                filename = f"⏰定时运营-{task_type_str}"
                
                print(f"⏰ [Scheduler] Triggering scheduled task '{task.id}' (Type: {task.task_type}) with Execution ID: {execution_task_id}")
                
                # Check user session
                user = db.query(models.UserSession).filter(models.UserSession.mobile == task.mobile).first()
                
                session_valid = False
                reauth_log_lines = []
                
                if user:
                    # 1. 校验当前 session 状态是否依然有效
                    session_valid = is_session_active(user.session_id)
                    
                    if not session_valid:
                        # 2. 授权失效，尝试自动使用密码进行登录授权
                        if user.password:
                            now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            reauth_log_lines.append(f"[{now_str}] 🔄 检测到企微宝账号 {task.mobile} 授权已失效，正在尝试使用密码自动登录授权并继续任务...\n")
                            try:
                                new_cookie, new_uid = login_qyb(user.mobile, user.password)
                                user.session_id = new_cookie
                                if new_uid:
                                    user.uid = new_uid
                                user.updated_at = datetime.datetime.now()
                                db.commit()
                                session_valid = True
                                now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                reauth_log_lines.append(f"[{now_str}] ✅ 企微宝自动登录授权成功，Cookie 刷新成功。\n")
                            except Exception as login_err:
                                now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                reauth_log_lines.append(f"[{now_str}] ❌ 企微宝自动登录授权失败: {str(login_err)}\n")
                        else:
                            now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            reauth_log_lines.append(f"[{now_str}] ⚠️ 检测到企微宝账号 {task.mobile} 授权已失效，由于该账号未存储密码，无法执行自动登录授权。\n")
                
                if not user or not session_valid:
                    # Write failure log
                    log_dir = "tasks/logs"
                    os.makedirs(log_dir, exist_ok=True)
                    log_file_path = f"{log_dir}/{execution_task_id}.log"
                    with open(log_file_path, "w", encoding="utf-8") as f:
                        for line in reauth_log_lines:
                            f.write(line)
                        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        f.write(f"[{now_str}] ❌ 企微宝账号 {task.mobile} 授权已失效，执行中止。\n")
                        f.write("--- 任务运行失败 ---\n")
                    
                    # Log record in database as failed
                    new_rec = models.TaskRecord(
                        id=execution_task_id,
                        filename=filename,
                        status="failed",
                        log_path=log_file_path,
                        concurrency=1,
                        created_at=now_local,
                        completed_at=now_local,
                        task_type="groupsend"
                    )
                    db.add(new_rec)
                    
                    # Update scheduled task properties
                    task.last_run_at = now_local
                    if task.schedule_type == "once":
                        task.status = "completed"
                        task.next_run_at = None
                    else:
                        task.next_run_at = calculate_next_run(task.recurrence, task.run_time, task.interval_value, task.interval_unit, now_local)
                    db.commit()
                    continue
                
                # If we successfully re-authorized, write the reauth messages to the log file so the user sees it!
                log_dir = "tasks/logs"
                os.makedirs(log_dir, exist_ok=True)
                log_file_path = f"{log_dir}/{execution_task_id}.log"
                if reauth_log_lines:
                    with open(log_file_path, "w", encoding="utf-8") as f:
                        for line in reauth_log_lines:
                            f.write(line)
                
                # Register Task Record as running
                new_rec = models.TaskRecord(
                    id=execution_task_id,
                    filename=filename,
                    status="running",
                    log_path=log_file_path,
                    concurrency=1,
                    created_at=now_local,
                    task_type="groupsend"
                )
                db.add(new_rec)
                db.commit()
                
                # Trigger ops engine execution
                try:
                    from ..main import task_manager
                    
                    params = {
                        "module": task.module,
                        "group_id": task.group_id,
                        "task_id": task.task_id,
                        "style": task.style,
                        **(task.params or {})
                    }
                    
                    task_manager.start_ops_task(
                        task_id=execution_task_id,
                        task_type=task.task_type,
                        session_id=user.session_id,
                        params=params
                    )
                except Exception as trigger_err:
                    # Write failure log
                    log_dir = "tasks/logs"
                    os.makedirs(log_dir, exist_ok=True)
                    log_file_path = f"{log_dir}/{execution_task_id}.log"
                    with open(log_file_path, "w", encoding="utf-8") as f:
                        f.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ 触发运行失败: {str(trigger_err)}\n")
                    
                    new_rec.status = "failed"
                    new_rec.completed_at = now_local
                    db.commit()
                
                # Update scheduled task state
                task.last_run_at = now_local
                if task.schedule_type == "once":
                    task.status = "completed"
                    task.next_run_at = None
                else:
                    task.next_run_at = calculate_next_run(task.recurrence, task.run_time, task.interval_value, task.interval_unit, now_local)
                db.commit()
                
            db.close()
        except Exception as err:
            print(f"⚠️ [Scheduler Error] Exception in background loop: {err}")
            
        time.sleep(10)

_scheduler_thread = None

def start_scheduler():
    global _scheduler_thread
    if _scheduler_thread is None:
        _scheduler_thread = threading.Thread(target=scheduler_loop, name="QYBSchedulerThread", daemon=True)
        _scheduler_thread.start()
