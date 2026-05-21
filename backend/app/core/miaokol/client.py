# -*- coding: utf-8 -*-
import requests
import json
import random
import copy
from datetime import datetime, timedelta
from typing import List, Dict, Union

# Local data pool
try:
    from .data import DEFAULT_TITLES, FANTASY_TITLES, IMAGES, ICONS, FORBIDDEN_KEYWORDS
except ImportError:
    DEFAULT_TITLES, FANTASY_TITLES, IMAGES, ICONS, FORBIDDEN_KEYWORDS = [], [], [], [], []

class MiaokolClient:
    """
    Python client for Miaokol (企微宝) task automation.
    """
    BASE_URL = "https://tool.miaokol.com"
    
    ENDPOINTS = {
        "GROUPS": lambda module: f"/api/module_group/list?module={module}",
        "TASKS": lambda module, group_id: f"/api/group_send/cyclicTaskList?module={module}&group_id={group_id}",
        "TASK_DETAIL": lambda module, task_id: f"/api/group_send/cyclicTaskList?module={module}&is_cloud=1&task_id={task_id}",
        "UPDATE": "/api/group_send/editCyclicTask",
        "CORP_LIST": "/api/corp/list",
        "WECHAT_LIST": lambda corp_id: f"/api/wechat/list?corp_id={corp_id}",
        "CORP_TAGS": lambda corp_id: f"/api/wechat/corpTags?corp_id={corp_id}",
        "CONTACT_SEARCH": "/api/contact/search",
        "MOMENT_CREATE": "/api/moment_task/create",
        "GS_LIST": lambda module, title, page_size: f"/api/group_send/list?module={module}&is_cloud=1&title={title}&page_size={page_size}",
        "GS_DETAIL": lambda module, task_id: f"/api/group_send/list?module={module}&is_cloud=1&task_id={task_id}",
        "GS_CREATE": "/api/group_send/create",
        "SOP_TPL_DETAIL": lambda tpl_id, is_personal: f"/api/sop/tplList?tpl_id={tpl_id}&is_personal={is_personal}",
        "SOP_TPL_ITEMS": lambda tpl_id: f"/api/sop/tplItemList?tpl_id={tpl_id}&page_size=999",
        "SOP_TPL_LIST": lambda search, is_personal: f"/api/sop/tplList?search={search}&is_personal={is_personal}",
        "SOP_TPL_UPDATE": "/api/sop/addTpl",
        "SIGNIN": "/api/user/signin"
    }

    def __init__(self, cookie: str = None, dry_run: bool = False):
        self.session = requests.Session()
        self.dry_run = dry_run
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json;charset=UTF-8"
        })
        if cookie:
            self.session.headers.update({"Cookie": cookie})
        self.used_titles = set()
        self.used_images = set()
        
        # Title pools configuration
        self.title_pools = {
            "Default": DEFAULT_TITLES,
            "Fantasy": FANTASY_TITLES,
            "玄幻": FANTASY_TITLES # Alias
        }
        
        # Shuffled stacks for uniform randomization
        self.title_stacks = {
            style: list(pool) for style, pool in self.title_pools.items()
        }
        for stack in self.title_stacks.values():
            random.shuffle(stack)
            
        self._image_stack = list(IMAGES)
        random.shuffle(self._image_stack)

    def fetch_api(self, url: str, method: str = "GET", data: Dict = None) -> Dict:
        full_url = f"{self.BASE_URL}{url}" if url.startswith("/") else url
        
        # Only dry-run for non-GET requests (submissions)
        if self.dry_run and method != "GET":
            print(f"[DRY-RUN] {method} {full_url}")
            if data:
                print(f"[DRY-RUN] Payload: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return {"errcode": 0, "message": "Dry run success", "data": {}}

        if method == "GET":
            resp = self.session.get(full_url)
        else:
            resp = self.session.post(full_url, json=data)
        
        resp.raise_for_status()
        result = resp.json()
        
        # Miaokol returns errcode as int or str "0"
        errcode = result.get("errcode")
        if errcode not in [0, "0"]:
            raise Exception(f"API Error: {result.get('message', 'Unknown error')}")
            
        return result

    def get_groups(self, module: int) -> List[Dict]:
        all_groups = []
        page = 1
        while True:
            url = f"{self.ENDPOINTS['GROUPS'](module)}&page={page}&page_size=100"
            res = self.fetch_api(url)
            groups = res.get("data", [])
            if not groups:
                break
            
            all_groups.extend(groups)
            
            pager = res.get("pager", {})
            if page >= pager.get("numPages", 1):
                break
            page += 1
        return all_groups

    def get_tasks_in_group(self, module: int, group_id: int) -> List[Dict]:
        all_tasks = []
        page = 1
        while True:
            # Added page_size=100 to reduce total requests
            url = f"{self.ENDPOINTS['TASKS'](module, group_id)}&page={page}&page_size=100"
            res = self.fetch_api(url)
            tasks = res.get("data", [])
            if not tasks:
                break
                
            all_tasks.extend(tasks)
            
            # The pager is in the response root, not inside 'data'
            pager = res.get("pager", {})
            if page >= pager.get("numPages", 1):
                break
            page += 1
            
        return all_tasks

    def get_task_detail(self, module: int, task_id: int) -> Dict:
        res = self.fetch_api(self.ENDPOINTS["TASK_DETAIL"](module, task_id))
        data = res.get("data", [])
        return data[0] if isinstance(data, list) and data else data

    def _pick_random(self, pool_type: str, used_set: set, original_value: str, style: str = "Default") -> str:
        """
        Improved version using a shuffled stack to ensure perfect uniformity
        and zero duplicates within a full cycle of the pool.
        """
        if pool_type == "title":
            # Map style names to canonical names
            canon_style = "Fantasy" if style in ["Fantasy", "玄幻"] else "Default"
            pool = self.title_pools.get(canon_style, DEFAULT_TITLES)
            stack = self.title_stacks.get(canon_style, [])
        else:
            pool = IMAGES
            stack = self._image_stack
            
        if not pool:
            return original_value
            
        norm_orig = str(original_value or "").strip()
        skipped = []
        picked = None
        
        while not picked:
            if not stack:
                # Stack exhausted, refill and reshuffle
                stack.extend(pool)
                random.shuffle(stack)
            
            candidate = stack.pop()
            if str(candidate).strip() != norm_orig:
                picked = candidate
            else:
                # Temporarily skip if it's the same as original
                skipped.append(candidate)
                if len(skipped) >= len(pool):
                    # Edge case: pool only contains the original value
                    picked = skipped.pop()
                    break
        
        # Put skipped items back into stack for future use
        if skipped:
            stack.extend(skipped)
            # Optional: reshuffle the tail slightly to avoid predictable return of skipped items
            if len(stack) > 10:
                tail = stack[-10:]
                random.shuffle(tail)
                stack[-10:] = tail

        used_set.add(str(picked).strip())
        return picked

    def _resolve_random_title(self, current_title: str, style: str = "Default") -> str:
        random_title = self._pick_random("title", self.used_titles, current_title, style=style)
        if random_title and ICONS:
            icon = random.choice(ICONS)
            random_title = f"{icon}{random_title}".strip()
        return random_title

    def _resolve_random_image(self, current_image: str) -> str:
        return self._pick_random("image", self.used_images, current_image)

    def _apply_updates_to_item(self, item: Dict, final_title: str = None, final_desc: str = None, final_image: str = None, final_url: str = None):
        """
        Helper to apply standard updates to a content item, ensuring consistency across redundant fields.
        """
        if "content" not in item:
            item["content"] = {}
        item_content = item["content"]
        msg_type = item.get("type") or item.get("msg_type")
        
        if msg_type == "link":
            item.setdefault("link", {})
            link = item["link"]
            if final_url:
                link["linkValue"] = final_url
                item_content["url"] = final_url
            if final_title:
                link["linkTitle"] = final_title
                item_content["title"] = final_title
            if final_image:
                link["linkImg"] = final_image
                item_content["cover"] = final_image
            if final_desc is not None:
                link["linkDesc"] = final_desc
                item_content["desc"] = final_desc
        elif msg_type == "program":
            if final_title:
                item_content["title"] = final_title
            if final_url:
                # Update both possible locations for page path
                item_content["page"] = final_url
                org = item_content.get("org_content")
                if isinstance(org, dict):
                    org["page"] = final_url
                else:
                    item_content["org_content"] = {"page": final_url}
            if final_image:
                item_content["cover"] = final_image

    def update_task(self, module: int, group_id: int, task_id: int, indices: Union[int, List[int], str], 
                    updates: Dict = None, auto_update: bool = True, dry_run: bool = False, style: str = "Default"):
        """
        Mirroring MiaokolSimple._updateSingleTask logic.
        """
        updates = updates or {}
        full_task = self.get_task_detail(module, task_id)
        
        # Deep copy content
        content_list = json.loads(json.dumps(full_task.get("content", [])))
        
        # Resolve indices
        if indices == "ALL":
            idx_list = list(range(1, len(content_list) + 1))
        elif isinstance(indices, list):
            idx_list = indices
        else:
            idx_list = [indices]
            
        for idx in idx_list:
            zero_idx = idx - 1
            if zero_idx < 0 or zero_idx >= len(content_list):
                print(f"Index {idx} out of range for task {task_id}")
                continue
                
            item = content_list[zero_idx]
            item_content = item.get("content", {})
            
            current_title = item_content.get("title") or item.get("link", {}).get("linkTitle", "")
            current_desc = item_content.get("desc") or item.get("link", {}).get("linkDesc", "")
            
            # Keyword filter
            has_forbidden = any(k in current_title or k in current_desc for k in FORBIDDEN_KEYWORDS)
            should_auto = auto_update and not has_forbidden
            
            # Resolve updates
            random_title = self._resolve_random_title(current_title, style=style) if should_auto else None
            final_title = updates.get("title") or random_title
            
            final_desc = updates.get("desc")
            
            final_image = updates.get("image") or updates.get("cover")
            if not final_image and should_auto:
                final_image = self._resolve_random_image(item_content.get("cover", ""))
                
            final_url = updates.get("url") or updates.get("page")
            
            self._apply_updates_to_item(item, final_title, final_desc, final_image, final_url)

        if dry_run:
            print(f"[DRY-RUN] Would update task '{full_task.get('title')}' with new content.")
            return True

        # Prepare payload
        payload = {
            **full_task,
            "module": module,
            "group_id": group_id,
            "task_id": task_id,
            "content": content_list,
            "target_cfg": full_task.get("target_cfg") or full_task.get("extra", {}).get("target_cfg"),
            "cycle_cfg": full_task.get("cycle_cfg") or full_task.get("extra", {}).get("cycle_cfg"),
            "sender_wxids": full_task.get("sender_wxids") or full_task.get("extra", {}).get("sender_wxids")
        }
        if "extra" in payload:
            del payload["extra"]
            
        self.fetch_api(self.ENDPOINTS["UPDATE"], method="POST", data=payload)
        print(f"Task '{full_task.get('title')}' successfully updated.")
        return True

    def replace_url_in_task(self, module: int, group_id: int, task_id: int, 
                            cur_url: str, new_url: str, 
                            auto_update: bool = True, dry_run: bool = False, style: str = "Default") -> bool:
        """
        Find and replace a specific URL within a task's content.
        """
        full_task = self.get_task_detail(module, task_id)
        content_list = json.loads(json.dumps(full_task.get("content", [])))
        
        target_indices = []
        for idx, item in enumerate(content_list, 1):
            item_content = item.get("content", {})
            msg_type = item.get("type") or item.get("msg_type")
            
            found = False
            if msg_type == "link":
                if item.get("link", {}).get("linkValue") == cur_url or item_content.get("url") == cur_url:
                    found = True
            elif msg_type == "program":
                org_page = ""
                org = item_content.get("org_content")
                if isinstance(org, dict):
                    org_page = org.get("page")
                elif isinstance(org, str):
                    org_page = org
                
                if org_page == cur_url or item_content.get("page") == cur_url:
                    found = True
            
            if found:
                target_indices.append(idx)

        if not target_indices:
            print(f"No matching URL '{cur_url}' found in task '{full_task.get('title')}'")
            return False

        print(f"Replacing URL in task '{full_task.get('title')}' at indices {target_indices}")
        
        # Reuse update_task logic for simplicity, or implement dedicated update if preferred
        # Since I've refactored _apply_updates_to_item, I'll use that loop directly here to be more efficient
        # instead of calling update_task which would re-fetch detail.
        
        for idx in target_indices:
            zero_idx = idx - 1
            item = content_list[zero_idx]
            item_content = item.get("content", {})
            
            current_title = item_content.get("title") or item.get("link", {}).get("linkTitle", "")
            current_desc = item_content.get("desc") or item.get("link", {}).get("linkDesc", "")
            
            has_forbidden = any(k in current_title or k in current_desc for k in FORBIDDEN_KEYWORDS)
            should_auto = auto_update and not has_forbidden
            
            final_title = self._resolve_random_title(current_title, style=style) if should_auto else None
            final_image = self._resolve_random_image(item_content.get("cover", "")) if should_auto else None
            
            self._apply_updates_to_item(item, final_title=final_title, final_image=final_image, final_url=new_url)

        if dry_run:
            print(f"[DRY-RUN] Would update task '{full_task.get('title')}' with new URL '{new_url}'")
            return True

        # Prepare payload
        payload = {
            **full_task,
            "module": module,
            "group_id": group_id,
            "task_id": task_id,
            "content": content_list,
            "target_cfg": full_task.get("target_cfg") or full_task.get("extra", {}).get("target_cfg"),
            "cycle_cfg": full_task.get("cycle_cfg") or full_task.get("extra", {}).get("cycle_cfg"),
            "sender_wxids": full_task.get("sender_wxids") or full_task.get("extra", {}).get("sender_wxids")
        }
        if "extra" in payload:
            del payload["extra"]
            
        self.fetch_api(self.ENDPOINTS["UPDATE"], method="POST", data=payload)
        print(f"Task '{full_task.get('title')}' successfully updated (URL replaced).")
        return True

    def get_task_contents(self, module: int, task_id: int) -> List[Dict]:
        """
        Extract content items with their index, type, and URL/Page.
        """
        full_task = self.get_task_detail(module, task_id)
        content_list = full_task.get("content", [])
        
        results = []
        for idx, item in enumerate(content_list, 1):
            item_content = item.get("content", {})
            msg_type = item.get("type") or item.get("msg_type")
            
            url = ""
            if msg_type == "link":
                url = item.get("link", {}).get("linkValue") or item_content.get("url") or ""
            elif msg_type == "program":
                url = item_content.get("org_content", {}).get("page") or ""
            
            results.append({
                "task_name": full_task.get("title"),
                "index": idx,
                "type": msg_type,
                "url": url
            })
        return results




##----------------------------- 查询模块 -----------------------------##

    def get_corps(self) -> List[Dict]:
        """Fetch list of authorized enterprises."""
        res = self.fetch_api(self.ENDPOINTS["CORP_LIST"])
        return res.get("data", [])

    def get_wechat_accounts(self, corp_id: int) -> List[Dict]:
        """Fetch WeChat accounts for a specific enterprise."""
        # Use a large page_size to get all accounts at once if possible
        url = f"{self.ENDPOINTS['WECHAT_LIST'](corp_id)}&page=1&page_size=1000"
        res = self.fetch_api(url)
        return res.get("data", [])

    def get_corp_tags(self, corp_id: int) -> List[Dict]:
        """Fetch enterprise tags for a specific enterprise."""
        res = self.fetch_api(self.ENDPOINTS["CORP_TAGS"](corp_id))
        # The API returns a list of tag groups, each containing a list of tags
        return res.get("data", [])

    def search_customers(self, corp_name: str = None, wechat_name: str = None, 
                         tags: List[str] = None, relationship: str = None, 
                         start_time: str = None, end_time: str = None,
                         page: int = 1, page_size: int = 1000) -> Dict:
        """
        Comprehensive customer search with automatic name-to-ID resolution.
        
        Args:
            corp_name: Target corporate name.
            wechat_name: Target WeChat account name or wxid.
            tags: List of tag names to filter by (OR logic).
            relationship: "Normal" or "Lost".
            start_time: Filter by addition time (YYYY-MM-DD HH:MM:SS).
            end_time: Filter by addition time (YYYY-MM-DD HH:MM:SS).
        """
        include_params = {}
        rel_wxid = ""

        # 1. Resolve corp_id
        corps = self.get_corps()
        if corp_name:
            target_corp = next((c for c in corps if corp_name == c.get('short_name', '')), None)
            if not target_corp:
                available_corps = [c.get('short_name') or c.get('name') for c in corps]
                raise ValueError(f"Enterprise '{corp_name}' not found. Available: {available_corps}")
        else:
            target_corp = corps[0] if corps else None
            if not target_corp:
                raise ValueError("No authorized enterprises found.")
        
        corp_id = target_corp['id']
        include_params["corp_id"] = corp_id

        # 2. Resolve rel_wxid (manager account)
        if wechat_name:
            accounts = self.get_wechat_accounts(corp_id)
            # Robust matching across multiple fields
            target_acc = next((
                a for a in accounts if 
                wechat_name in a.get('nickname', '') or 
                wechat_name in a.get('full_name', '') or 
                wechat_name in a.get('wx_alias', '') or 
                wechat_name == a.get('wxid', '')
            ), None)
            
            if not target_acc:
                raise ValueError(f"WeChat account '{wechat_name}' not found in enterprise '{target_corp.get('short_name') or target_corp.get('name')}'.")
            
            rel_wxid = target_acc['wxid']

        # 3. Resolve tags
        if tags:
            tag_groups = self.get_corp_tags(corp_id)
            # Flatten all tags into a searchable map
            all_tags_map = {}
            for group in tag_groups:
                for tag in group.get('tags', []):
                    all_tags_map[tag.get('wx_name')] = tag.get('wxid')
            
            tag_ids = []
            missing_tags = []
            for t_name in tags:
                if t_name in all_tags_map:
                    tag_ids.append(all_tags_map[t_name])
                else:
                    missing_tags.append(t_name)
            
            if missing_tags:
                available_tag_names = list(all_tags_map.keys())[:20]
                raise ValueError(f"Tags not found in enterprise: {missing_tags}. Available (first 20): {available_tag_names}")
            
            if tag_ids:
                include_params["corp_tag"] = {"match_type": "1", "ids": tag_ids}

        # 4. Resolve relationship (zombie_type)
        if relationship:
            # 0: Normal, 3: Lost
            rel_map = {"Normal": "0", "正常好友": "0", "Lost": "3", "流失好友": "3"}
            include_params["zombie_type"] = rel_map.get(relationship, relationship)

        # 5. Resolve time range
        if start_time or end_time:
            include_params["create_time"] = {
                "start": start_time or "1970-01-01 00:00:00",
                "end": end_time or "2099-12-31 23:59:59"
            }

        payload = {
            "page": page,
            "page_size": page_size,
            "rel_wxid": rel_wxid,
            "include_params": include_params,
            "exclude_params": {}
        }

        return self.fetch_api(self.ENDPOINTS["CONTACT_SEARCH"], method="POST", data=payload)


#--------------------------- 创建朋友圈 -----------------------------#
    def create_moment(self, enterprise: str, wechat_sender: str = None, 
                      tags: List[str] = None, title: str = None, 
                      content: str = None, comments: List[str] = None, 
                      delay_del_hours: int = 0, send_time: str = None, 
                      link_url: str = None, link_title: str = None, 
                      link_pic: str = None, dry_run: bool = False) -> Dict:
        """
        Create a customer moment task.
        
        Args:
            enterprise: Enterprise name (exact match with short_name).
            wechat_sender: Manager name or WeChat ID (fuzzy match). If None, defaults to all enterprise employees.
            tags: Optional list of tag names for recipient filtering.
            title: Task title.
            content: Main text content of the moment (for text-only).
            comments: Optional list of strings for post-task comments.
            delay_del_hours: If > 0, schedule auto-deletion after X hours.
            send_time: Scheduled time (YYYY-MM-DD HH:mm:ss). If None, sends immediately.
            link_url: URL for the moment link (optional).
            link_title: Title for the link (optional).
            link_pic: Cover image URL for the link (optional).
        """
        # 1. Resolve corp_id
        corps = self.get_corps()
        if enterprise:
            target_corp = next((c for c in corps if c.get('short_name') == enterprise), None)
            if not target_corp:
                raise ValueError(f"Enterprise '{enterprise}' not found (requires exact match with short_name).")
        else:
            target_corp = corps[0] if corps else None
            if not target_corp:
                raise ValueError("No authorized enterprises found.")
        
        corp_id = target_corp['id']

        # 2. Resolve sender wxids
        accounts = self.get_wechat_accounts(corp_id)
        if not accounts:
            raise ValueError(f"No WeChat accounts found for enterprise {corp_id}.")

        if wechat_sender:
            target_acc = next((
                a for a in accounts if 
                wechat_sender in a.get('nickname', '') or 
                wechat_sender in a.get('full_name', '') or 
                wechat_sender in a.get('wx_alias', '') or 
                wechat_sender == a.get('wxid', '')
            ), None)
            
            if not target_acc:
                raise ValueError(f"WeChat account '{wechat_sender}' not found.")
            sender_wxids = [target_acc['wxid']]
        else:
            # Default to all employees if none specified
            sender_wxids = [a['wxid'] for a in accounts]

        # 3. Handle Filtering (contact_cfg)
        contact_cfg = {"all_visible": True, "search": {}}
        if tags:
            tag_groups = self.get_corp_tags(corp_id)
            all_tags_map = {}
            for group in tag_groups:
                for tag in group.get('tags', []):
                    all_tags_map[tag.get('wx_name')] = tag.get('wxid')
            
            tag_wxids = []
            for t_name in tags:
                if t_name in all_tags_map:
                    tag_wxids.append(all_tags_map[t_name])
                else:
                    available_tags = sorted(list(all_tags_map.keys()))
                    raise ValueError(
                        f"Tag '{t_name}' not found in enterprise '{target_corp.get('short_name')}'.\n"
                        f"Available tags: {', '.join(available_tags)}"
                    )
            
            if tag_wxids:
                contact_cfg = {
                    "all_visible": False,
                    "search": {
                        "check_all": 1,
                        "wxids": [],
                        "params": {
                            "checked": 1,
                            "type": "part",
                            "groups": [
                                {
                                    "include_params": {
                                        "corp_tag": {
                                            "wxids": tag_wxids,
                                            "match_type": "1"
                                        }
                                    }
                                }
                            ],
                            "group_op": "or"
                        }
                    }
                }

        # 4. Handle Comments
        formatted_comments = []
        if comments:
            for c_text in comments:
                formatted_comments.append({
                    "text": c_text,
                    "delay_time": {"interval": 0, "unit": "minute", "time": ""}
                })

        # 5. Handle Deletion
        del_cfg = {"switch": 0, "delay_interval": 1, "delay_unit": "hour"}
        if delay_del_hours > 0:
            del_cfg = {
                "switch": 1,
                "delay_interval": delay_del_hours,
                "delay_unit": "hour"
            }

        # 6. Handle Content (Text vs Link)
        moment_data = {}
        if link_url:
            # Random image selection if link_pic is missing
            final_cover = link_pic
            if not final_cover and IMAGES:
                final_cover = random.choice(IMAGES)
            
            # Random link title if link_title is missing
            final_link_title = link_title
            if not final_link_title and DEFAULT_TITLES:
                final_link_title = random.choice(DEFAULT_TITLES)
            
            moment_data = {
                "link": {
                    "url": link_url,
                    "title": final_link_title,
                    "cover": final_cover,
                    "desc": ""
                }
            }
        else:
            moment_data = {"text": content or ""}

        # 7. Construct Payload
        payload = {
            "corp_id": corp_id,
            "title": title,
            "content": {
                "moment": moment_data,
                "comments": formatted_comments
            },
            "sender_wxids": sender_wxids,
            "contact_cfg": contact_cfg,
            "del_cfg": del_cfg,
            "send_type": 2 if send_time else 1, # 1: Immediate, 2: Scheduled
            "begin_time": send_time if send_time else "",
            "is_cloud": 1
        }

        if dry_run:
            print(f"[DRY-RUN] Would create moment task '{title}' for enterprise '{enterprise}'")
            return {"errcode": 0, "message": "Dry run success", "data": {}}

        return self.fetch_api(self.ENDPOINTS["MOMENT_CREATE"], method="POST", data=payload)

#--------------------------- 复制群发任务（高级群发/极速群发） -----------------------------#

    def get_group_send_by_name(self, name: str, module: int) -> Dict:
        """
        Search for a Group Send task by name (exact match) within a specific module.
        """
        url = self.ENDPOINTS["GS_LIST"](module, name, 100)
        res = self.fetch_api(url)
        tasks = res.get("data", [])
        
        # Exact match
        matched = [t for t in tasks if t.get("title") == name]
        if matched:
            # Return the latest one (highest ID assuming increasing)
            return sorted(matched, key=lambda x: x.get("id", 0), reverse=True)[0]
            
        # Not found, help the user by listing available names
        all_names = list(set([t.get("title") for t in tasks]))
        raise ValueError(
            f"Task '{name}' not found.\n"
            f"Available tasks in recent list: {', '.join(all_names) or 'None'}"
        )

    def create_group_send(self, payload: Dict, dry_run: bool = False) -> Dict:
        """
        Create a new Speed Group Send task.
        """
        url = self.ENDPOINTS["GS_CREATE"]
        if dry_run:
            print("\n[Dry-run] Speed Group Send Payload:")
            print(json.dumps(payload, indent=2, ensure_ascii=False))
            return {"status": 200, "message": "Dry-run skipped request", "data": payload}
            
        return self.fetch_api(url, method="POST", data=payload)

    def duplicate_group_send(
        self, 
        source_name: str, 
        module: int = 19,
        new_title: str = None,
        url_replacements: Dict[int, str] = None, 
        text: str = None, 
        send_time_str: str = None, 
        auto_update: bool = True,
        dry_run: bool = False,
        style: str = "Default"
    ) -> Dict:
        """
        Duplicate an existing task and selectively modify content.
        Preserves all original parameters by default.
        """
        # 1. Fetch Source Detail
        source_task = self.get_group_send_by_name(source_name, module)
        task_id = source_task.get("id")
        
        # Get full detail
        detail = self.fetch_api(self.ENDPOINTS["GS_DETAIL"](module, task_id))
        source_data = detail.get("data", [])[0]
        extra = source_data.get("extra", {})
        
        # 2. Inherit & Cleanup Configuration
        payload = copy.deepcopy(source_data)
        
        # Remove metadata/status fields to prevent conflicts during 'add'
        for key in ["id", "ctime", "utime", "update_time", "create_time", "status", "send_status", "extra"]:
            payload.pop(key, None)
            
        # Explicit overrides
        payload.update({
            "title": new_title or (source_data.get("title") + " (复制)"),
            "module": module,
            "is_cloud": 1
        })
        
        # Ensure robust field inheritance from source_data or extra
        if not payload.get("sender_wxids"):
            payload["sender_wxids"] = extra.get("sender_wxids", [])
        if not payload.get("target_cfg"):
            payload["target_cfg"] = extra.get("target_cfg", {})
        if not payload.get("interval_cfg"):
            payload["interval_cfg"] = extra.get("interval_cfg", [])

        orig_send_type = int(source_data.get("send_type", 1))
        orig_cycle_cfg = source_data.get("cycle_cfg") or extra.get("cycle_cfg", {})
        payload["send_type"] = orig_send_type
        payload["cycle_cfg"] = orig_cycle_cfg
        
        # 3. Handle Send Time & Scheduler Logic
        if send_time_str:
            dt = datetime.strptime(send_time_str, "%Y-%m-%d %H:%M:%S")
            payload["send_type"] = 2
            payload["begin_time"] = int(dt.timestamp())
            payload["cycle_cfg"] = {}
        elif orig_send_type in [1, 2]:
            payload["send_type"] = 2
            future = datetime.now() + timedelta(minutes=30)
            payload["begin_time"] = int(future.timestamp())
            payload["cycle_cfg"] = {}
        else:
            # Cycle tasks: keep as is, remove begin_time if it exists
            payload.pop("begin_time", None)

        # 4. Handle Content Modification
        new_content = payload.get("content", [])
        attachment_count = 0
        url_replacements = url_replacements or {}
        
        for item in new_content:
            msg_type = item.get("msg_type")
            
            # Handle Text Replacement (Global if text provided)
            if msg_type == "text" and text is not None:
                item["content"] = text
                continue
            
            # Count only Link and Program as "attachments" for url-N mapping
            if msg_type in ["link", "program"]:
                attachment_count += 1
                
                # Check for Forbidden Keywords if auto_update is on
                item_content = item.get("content", {})
                current_title = item_content.get("title") or item.get("link", {}).get("linkTitle", "")
                current_desc = item_content.get("desc") or item.get("link", {}).get("linkDesc", "")
                has_forbidden = any(k in current_title or k in current_desc for k in FORBIDDEN_KEYWORDS)
                should_auto = auto_update and not has_forbidden

                if attachment_count in url_replacements or should_auto:
                    new_val = url_replacements.get(attachment_count)
                    
                    # Resolve updates
                    final_title = self._resolve_random_title(current_title, style=style) if should_auto else None
                    final_img = self._resolve_random_image(item_content.get("cover", "")) if should_auto else None
                    
                    # Use helper for consistent update
                    self._apply_updates_to_item(
                        item, 
                        final_title=final_title, 
                        final_image=final_img, 
                        final_url=new_val,
                        final_desc=None if not text else text # Text only replaces top-level text items usually
                    )

        payload["content"] = new_content
        
        # 5. Submit
        return self.create_group_send(payload, dry_run=dry_run)


#--------------------------- SOP 模板修改 -----------------------------#

    def get_sop_template(self, tpl_id: int, is_personal: int = 0) -> Dict:
        """Fetch full details of an SOP template by merging summary and items."""
        # 1. Fetch summary
        res_summary = self.fetch_api(self.ENDPOINTS["SOP_TPL_DETAIL"](tpl_id, is_personal))
        summary_data = res_summary.get("data", [])
        template = summary_data[0] if isinstance(summary_data, list) and summary_data else {}
        
        if not template:
            return {}
            
        # 2. Fetch items
        res_items = self.fetch_api(self.ENDPOINTS["SOP_TPL_ITEMS"](tpl_id))
        template["tpl_items"] = res_items.get("data", [])
        
        return template

    def get_sop_template_urls(self, tpl_id: int, is_personal: int = 0) -> List[Dict]:
        """Collect all URLs (link and program) from an SOP template's items."""
        full_tpl = self.get_sop_template(tpl_id, is_personal)
        if not full_tpl:
            return []
            
        results = []
        tpl_items = full_tpl.get("tpl_items", [])
        
        for day_item in tpl_items:
            messages = day_item.get("messages", [])
            day = day_item.get("day", "?")
            for msg in messages:
                msg_type = msg.get("type") or msg.get("msg_type")
                if msg_type not in ["link", "program"]:
                    continue
                
                item_content = msg.get("content", {})
                title = item_content.get("title") or msg.get("link", {}).get("linkTitle", "")
                url = ""
                
                if msg_type == "link":
                    url = msg.get("link", {}).get("linkValue") or item_content.get("url") or ""
                elif msg_type == "program":
                    url = item_content.get("org_content", {}).get("page") or ""
                
                results.append({
                    "day": day,
                    "type": msg_type,
                    "title": title,
                    "url": url
                })
        return results

    def find_sop_template(self, search_query: str, is_personal: int = 0) -> Dict:
        """Find an SOP template by name and return its full detail."""
        res = self.fetch_api(self.ENDPOINTS["SOP_TPL_LIST"](search_query, is_personal))
        data = res.get("data", [])
        
        if not data:
            return {}
            
        # Try to find exact match
        best_match = data[0]
        for tpl in data:
            if tpl.get("name") == search_query:
                best_match = tpl
                break
                
        # Fetch full detail (with items) using the resolved ID
        return self.get_sop_template(best_match["id"], is_personal)

    def update_sop_template(self, tpl_id: int, is_personal: int = 0, 
                            cur_url: str = None, new_url: str = None, 
                            title: str = None, image: str = None, desc: str = None,
                            auto_update: bool = True, dry_run: bool = False, style: str = "Default") -> Dict:
        """
        Update an SOP template's content.
        Features:
          - Auto-randomize title/cover for program/link messages (if auto_update is True).
          - Replace old URL/Page with a new one (if cur_url and new_url are provided).
          - Explicitly set title/image/desc if provided.
        """
        full_tpl = self.get_sop_template(tpl_id, is_personal)
        if not full_tpl:
            raise ValueError(f"SOP Template {tpl_id} not found.")

        # Deep copy template data for modification
        payload = copy.deepcopy(full_tpl)
        tpl_items = payload.get("tpl_items", [])
        
        print(f"Analyzing SOP template '{payload.get('name')}' (ID: {tpl_id})...")

        for day_item in tpl_items:
            messages = day_item.get("messages", [])
            day = day_item.get("day", "?")
            for msg in messages:
                msg_type = msg.get("type") or msg.get("msg_type")
                if msg_type not in ["link", "program"]:
                    continue

                item_content = msg.get("content", {})
                
                # 1. URL/Page Matching
                is_match = False
                if cur_url and new_url:
                    if msg_type == "link":
                        if msg.get("link", {}).get("linkValue") == cur_url or item_content.get("url") == cur_url:
                            is_match = True
                            print(f"  - Day {day}: Found matching link URL '{cur_url}'")
                    elif msg_type == "program":
                        org_page = ""
                        org = item_content.get("org_content")
                        if isinstance(org, dict):
                            org_page = org.get("page")
                        elif isinstance(org, str):
                            org_page = org

                        if org_page == cur_url or item_content.get("page") == cur_url:
                            is_match = True
                            print(f"  - Day {day}: Found matching program page '{cur_url}'")

                # 2. Determine Updates
                current_title = item_content.get("title") or msg.get("link", {}).get("linkTitle", "")
                current_desc = item_content.get("desc") or msg.get("link", {}).get("linkDesc", "")

                # Keyword filter for safety
                has_forbidden = any(k in current_title or k in current_desc for k in FORBIDDEN_KEYWORDS)
                should_auto = auto_update and not has_forbidden

                final_title = title or (self._resolve_random_title(current_title, style=style) if should_auto else None)
                final_image = image or (self._resolve_random_image(item_content.get("cover", "")) if should_auto else None)
                final_url = new_url if is_match else None
                final_desc = desc

                # 3. Apply Updates
                if is_match or final_title or final_image or final_desc:
                    self._apply_updates_to_item(
                        msg, 
                        final_title=final_title, 
                        final_image=final_image, 
                        final_url=final_url,
                        final_desc=final_desc
                    )
                    if is_match:
                        print(f"    -> Replaced URL/Page with '{new_url}'")
                    if final_title:
                        print(f"    -> Set Title: {final_title}")
                    if final_image:
                        print(f"    -> Set Image: {final_image}")

        if dry_run:
            print(f"\n[DRY-RUN] Would update SOP template '{payload.get('name')}' (ID: {tpl_id})")
            return {"errcode": 0, "message": "Dry run success", "data": payload}

        res = self.fetch_api(self.ENDPOINTS["SOP_TPL_UPDATE"], method="POST", data=payload)
        print(f"SOP Template '{payload.get('name')}' successfully updated.")
        return res

    def login(self, mobile: str, password: str) -> str:
        """
        Authenticate with Miaokol using mobile and password.
        Returns the combined Cookie string.
        """
        payload = {
            "mobile": mobile,
            "password": password
        }
        
        # Ensure login headers are set
        login_headers = {
            "Accept": "application/json, text/plain, */*",
            "Origin": self.BASE_URL,
            "Referer": f"{self.BASE_URL}/"
        }
        
        url = f"{self.BASE_URL}{self.ENDPOINTS['SIGNIN']}"
        
        if self.dry_run:
            print(f"[DRY-RUN] POST {url}")
            print(f"[DRY-RUN] Payload: {json.dumps(payload, indent=2)}")
            return "DRY_RUN_COOKIE"

        resp = self.session.post(url, json=payload, headers=login_headers)
        resp.raise_for_status()
        
        result = resp.json()
        if result.get("errcode") not in [0, "0"]:
            raise Exception(f"Login failed: {result.get('message', 'Unknown error')}")
            
        # Extract cookies from session
        cookies_dict = self.session.cookies.get_dict()
        cookie_string = "; ".join([f"{k}={v}" for k, v in cookies_dict.items()])
        
        # Update headers for subsequent requests
        self.session.headers.update({"Cookie": cookie_string})
        
        print(f"Successfully logged in as {mobile}")
        return cookie_string

