from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    mobile: str
    password: str

class UserSessionSchema(BaseModel):
    mobile: str
    uid: str
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskPreview(BaseModel):
    sender: str
    tag: str
    receiver: str
    internal: bool
    start: int
    limit: int

class TaskCreate(BaseModel):
    tasks: List[TaskPreview]
    concurrency: int = 8

class SecretVerifyRequest(BaseModel):
    secret_key: str

class TaskResponse(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime
    concurrency: int
    stats: Optional[dict] = None
    task_type: Optional[str] = None

    class Config:
        from_attributes = True

class StatsQueryRequest(BaseModel):
    corp_name: str
    tag_type: str # 'smart' or 'enterprise'
    tag_name: str

class StatsItem(BaseModel):
    employee_name: str
    tag_name: str
    user_count: int

class GroupSendDuplicateRequest(BaseModel):
    source_name: str
    module: int = 19
    new_title: Optional[str] = None
    url_replacements: Optional[dict] = None
    text: Optional[str] = None
    send_time: Optional[str] = None
    auto_update: bool = True
    style: str = "Default"

class SopTemplateUpdateRequest(BaseModel):
    tpl_id: int
    cur_url: Optional[str] = None
    new_url: Optional[str] = None
    title: Optional[str] = None
    image: Optional[str] = None
    desc: Optional[str] = None
    auto_update: bool = True
    style: str = "Default"


class GroupSendOpsTaskStartRequest(BaseModel):
    task_type: str  # 'title_randomize' or 'url_replacement'
    module: int
    group_id: str
    task_id: str
    style: str  # 'Original', 'Default', 'Fantasy'
    cur_url: Optional[str] = None
    new_url: Optional[str] = None

class ScheduledTaskCreate(BaseModel):
    task_type: str  # 'title_randomize' or 'url_replacement'
    module: int
    group_id: str
    task_id: str
    style: str
    cur_url: Optional[str] = None
    new_url: Optional[str] = None
    
    schedule_type: str  # 'once' or 'recurring'
    recurrence: str  # 'once', 'daily', 'interval'
    run_time: Optional[str] = None  # '15:30' for daily
    timestamp: Optional[int] = None  # UNIX timestamp for once
    interval_value: Optional[int] = None
    interval_unit: Optional[str] = None  # 'minutes', 'hours', 'days'

class ScheduledTaskResponse(BaseModel):
    id: str
    mobile: str
    task_type: str
    module: int
    group_id: str
    task_id: str
    style: str
    params: Optional[dict] = None
    schedule_type: str
    recurrence: str
    run_time: Optional[str] = None
    interval_value: Optional[int] = None
    interval_unit: Optional[str] = None
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ClearFriendsTaskStartRequest(BaseModel):
    corp_name: str
    zombie_type: str  # '2' or '3'
    tag_name: Optional[str] = None




