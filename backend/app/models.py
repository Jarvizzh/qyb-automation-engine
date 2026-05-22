from sqlalchemy import Column, Integer, String, DateTime, JSON
from .database import Base
import datetime

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    mobile = Column(String, unique=True, index=True)
    session_id = Column(String)
    uid = Column(String)
    password = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

class TaskRecord(Base):
    __tablename__ = "task_records"

    id = Column(String, primary_key=True, index=True) # UUID
    filename = Column(String)
    status = Column(String) # pending, running, completed, stopped, failed
    created_at = Column(DateTime, default=datetime.datetime.now)
    completed_at = Column(DateTime, nullable=True)
    log_path = Column(String)
    concurrency = Column(Integer, default=8)
    stats = Column(JSON, nullable=True) # {total: 0, sent: 0, failed: 0}

class SystemConfig(Base):
    __tablename__ = "system_config"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

class ScheduledTask(Base):
    __tablename__ = "scheduled_tasks"

    id = Column(String, primary_key=True, index=True) # UUID
    mobile = Column(String, index=True)
    task_type = Column(String) # 'title_randomize' or 'url_replacement'
    module = Column(Integer)
    group_id = Column(String)
    task_id = Column(String)
    style = Column(String)
    params = Column(JSON, nullable=True) # {cur_url, new_url, style}
    
    schedule_type = Column(String) # 'once' or 'recurring'
    recurrence = Column(String) # 'once', 'daily', 'interval'
    run_time = Column(String, nullable=True) # '15:30' or datetime string
    interval_value = Column(Integer, nullable=True)
    interval_unit = Column(String, nullable=True) # 'minutes', 'hours', 'days'
    
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    status = Column(String, default="active") # 'active', 'paused', 'completed'
    created_at = Column(DateTime, default=datetime.datetime.now)

