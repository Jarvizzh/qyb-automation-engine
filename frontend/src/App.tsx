import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Play, Square, Download, UserCheck, Terminal, Trash2, Key, ShieldCheck, LogOut, Info, CheckCircle, AlertCircle, XCircle, BarChart2, Search, Loader2, BookOpen, Users, RefreshCw } from 'lucide-react';
import './App.css';
import type { TaskPreview, UserSession, StatsItem, GroupItem, GroupTaskItem, SopTemplateItem, SopUrlItem, RetentionReportItem } from './types';


// 自动检测 API 地址：开发环境默认 8000 端口，生产环境使用相对路径（由 Nginx 代理）
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : "");
const WS_BASE = (API_BASE || window.location.origin).replace(/^http/, 'ws');

function App() {
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'info' | 'success' | 'error' | 'warning'}[]>([]);
  const addToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<'auth' | 'task' | 'ops'>('auth');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedMobile, setSelectedMobile] = useState('');
  
  const [previewTasks, setPreviewTasks] = useState<TaskPreview[]>([]);
  const [concurrency, setConcurrency] = useState<number>(8);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<string[]>([]);
  const [showHistoryLogs, setShowHistoryLogs] = useState(false);

  // 统计模块状态
  const [corps, setCorps] = useState<string[]>([]);
  const [selectedCorp, setSelectedCorp] = useState('');
  const [tagType, setTagType] = useState<'smart' | 'enterprise'>('smart');
  const [tagName, setTagName] = useState('');
  const [statsResults, setStatsResults] = useState<StatsItem[]>([]);
  const [isStatsQuerying, setIsStatsQuerying] = useState(false);

  // 智能运营中心 (Operations Center) 状态
  const [opsSubTab, setOpsSubTab] = useState<'group-send' | 'sop' | 'reports' | 'stats'>('group-send');

  // A: 群发任务分发状态
  const [gsModule, setGsModule] = useState<number>(19); // 19: 新版极速群发, 7: 高级群发
  const [gsGroups, setGsGroups] = useState<GroupItem[]>([]);
  const [selectedGsGroupId, setSelectedGsGroupId] = useState<number | 'ALL' | ''>('');
  const [gsTasks, setGsTasks] = useState<GroupTaskItem[]>([]);
  const [selectedGsTaskId, setSelectedGsTaskId] = useState<number | 'ALL' | ''>('');
  const [randomizeStyle, setRandomizeStyle] = useState('Default'); // 'Default' or 'Fantasy'
  const [replaceSourceUrl, setReplaceSourceUrl] = useState('');
  const [replaceNewUrl, setReplaceNewUrl] = useState('');
  const [replaceStyle, setReplaceStyle] = useState('Original'); // 'Original', 'Default', 'Fantasy'
  const [isGsLoading, setIsGsLoading] = useState(false);
  const [isGsActionRunning, setIsGsActionRunning] = useState(false);

  // C: SOP 内容治理状态
  const [sopTemplates, setSopTemplates] = useState<SopTemplateItem[]>([]);
  const [selectedSopTemplateId, setSelectedSopTemplateId] = useState<number | ''>('');
  const [sopUrls, setSopUrls] = useState<SopUrlItem[]>([]);
  const [sopCurUrl, setSopCurUrl] = useState('');
  const [sopNewUrl, setSopNewUrl] = useState('');
  const [sopTitle, setSopTitle] = useState('');
  const [sopImage, setSopImage] = useState('');
  const [sopDesc, setSopDesc] = useState('');
  const [sopStyle, setSopStyle] = useState('Original');
  const [isSopLoading, setIsSopLoading] = useState(false);
  const [isSopActionRunning, setIsSopActionRunning] = useState(false);

  // D: 留存分析大盘状态
  const [retentionReports, setRetentionReports] = useState<RetentionReportItem[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  
  const consoleRef = useRef<HTMLDivElement>(null);
  const liveConsoleRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);


  const checkAuthStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/check-status`);
      setIsVerified(res.data.is_verified);
    } catch (err) {
      console.error("Check auth status failed", err);
      setIsVerified(false);
    }
  };

  const handleVerifySecret = async () => {
    if (!secretKey) return addToast("请输入系统密钥", "warning");
    setIsVerifying(true);
    try {
      await axios.post(`${API_BASE}/api/auth/verify-secret`, { secret_key: secretKey });
      setIsVerified(true);
      addToast("系统激活成功", "success");
    } catch (err: any) {
      addToast("验证失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`);
      setIsVerified(false);
      setSecretKey('');
      clearPersistence();
      addToast("已成功退出系统", "info");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    fetchSessions();
    const recoverTask = async () => {
      const savedTaskId = localStorage.getItem('currentTaskId');
      const savedPreview = localStorage.getItem('previewTasks');
      const savedMobile = localStorage.getItem('selectedMobile');
      
      if (savedTaskId) {
        try {
          const res = await axios.get(`${API_BASE}/api/tasks/${savedTaskId}/status`);
          if (res.data.is_active) {
            setCurrentTaskId(savedTaskId);
            if (savedPreview) setPreviewTasks(JSON.parse(savedPreview));
            if (savedMobile) setSelectedMobile(savedMobile);
            setIsTaskRunning(true);
            setLogs([]);
            connectWebSocket(savedTaskId);
            setActiveTab('task');
          } else {
            clearPersistence();
          }
        } catch (e) {
          clearPersistence();
        }
      }
    };
    recoverTask();
  }, []);

  useEffect(() => {
    if (activeTab === 'task') {
      fetchHistory();
    } else if (activeTab === 'ops') {
      if (selectedMobile) {
        if (opsSubTab === 'group-send') {
          fetchGsGroups();
        } else if (opsSubTab === 'sop') {
          fetchSopTemplates();
        } else if (opsSubTab === 'stats') {
          fetchCorps();
        }
      }
    }
  }, [activeTab, opsSubTab]);

  useEffect(() => {
    if (activeTab === 'ops' && selectedMobile) {
      if (opsSubTab === 'group-send') {
        fetchGsGroups();
      } else if (opsSubTab === 'sop') {
        fetchSopTemplates();
      } else if (opsSubTab === 'stats') {
        fetchCorps();
      }
    }
  }, [selectedMobile]);


  const fetchCorps = async () => {
    if (!selectedMobile) return;
    try {
      const res = await axios.get(`${API_BASE}/api/stats/corps?mobile=${selectedMobile}`);
      setCorps(res.data);
      if (res.data.length > 0 && !selectedCorp) {
        setSelectedCorp(res.data[0]);
      }
    } catch (err) {
      console.error("Fetch corps failed", err);
    }
  };

  const handleQueryStats = async () => {
    if (!selectedMobile) return addToast("请先选择授权账号", "warning");
    if (!selectedCorp) return addToast("请选择企业简称", "warning");
    if (!tagName) return addToast("请输入标签名字", "warning");

    setIsStatsQuerying(true);
    try {
      // 先检测授权是否过期
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      const res = await axios.post(`${API_BASE}/api/stats/query?mobile=${selectedMobile}`, {
        corp_name: selectedCorp,
        tag_type: tagType,
        tag_name: tagName
      });
      setStatsResults(res.data);
      if (res.data.length === 0) {
        addToast("未查找到匹配数据", "info");
      } else {
        addToast(`查询成功，共 ${res.data.length} 条记录`, "success");
      }
    } catch (err: any) {
      addToast("查询失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsStatsQuerying(false);
    }
  };

  // --- Operations Center API Functions ---

  // A: Group-Send Governance Functions
  const fetchGsGroups = async (moduleVal?: number) => {
    const mod = moduleVal !== undefined ? moduleVal : gsModule;
    if (!selectedMobile) return;
    setIsGsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/ops/group-send/groups?module=${mod}&mobile=${selectedMobile}`);
      setGsGroups(res.data);
      setSelectedGsGroupId('');
      setGsTasks([]);
      setSelectedGsTaskId('');
    } catch (err: any) {
      addToast("获取分组失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsGsLoading(false);
    }
  };

  const fetchGsTasks = async (groupId: number) => {
    if (!selectedMobile) return;
    setIsGsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/ops/group-send/tasks?module=${gsModule}&group_id=${groupId}&mobile=${selectedMobile}`);
      setGsTasks(res.data);
      setSelectedGsTaskId('');
    } catch (err: any) {
      addToast("获取任务列表失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsGsLoading(false);
    }
  };

  const handleStartRandomize = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    if (!selectedGsGroupId) return addToast("请选择任务分组", "warning");
    if (!selectedGsTaskId) return addToast("请选择任务", "warning");

    setIsGsActionRunning(true);
    try {
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      const payload = {
        task_type: 'title_randomize',
        module: gsModule,
        group_id: String(selectedGsGroupId),
        task_id: String(selectedGsTaskId),
        style: randomizeStyle
      };

      const res = await axios.post(`${API_BASE}/api/ops/group-send/start-task?mobile=${selectedMobile}`, payload);
      if (res.data.status === 'success') {
        const taskId = res.data.task_id;
        setCurrentTaskId(taskId);
        setIsTaskRunning(true);
        setLogs([]);
        connectWebSocket(taskId);
        addToast("标题/封面自动随机更换任务已启动！", "success");
        fetchHistory();
      } else {
        addToast("启动失败：" + JSON.stringify(res.data), "error");
      }
    } catch (err: any) {
      addToast("启动失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsGsActionRunning(false);
    }
  };

  const handleStartReplacement = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    if (!selectedGsGroupId) return addToast("请选择任务分组", "warning");
    if (!selectedGsTaskId) return addToast("请选择任务", "warning");
    if (!replaceSourceUrl.trim()) return addToast("请填写待替换的源链接", "warning");
    if (!replaceNewUrl.trim()) return addToast("请填写替换后的新链接", "warning");

    setIsGsActionRunning(true);
    try {
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      const payload = {
        task_type: 'url_replacement',
        module: gsModule,
        group_id: String(selectedGsGroupId),
        task_id: String(selectedGsTaskId),
        style: replaceStyle,
        cur_url: replaceSourceUrl.trim(),
        new_url: replaceNewUrl.trim()
      };

      const res = await axios.post(`${API_BASE}/api/ops/group-send/start-task?mobile=${selectedMobile}`, payload);
      if (res.data.status === 'success') {
        const taskId = res.data.task_id;
        setCurrentTaskId(taskId);
        setIsTaskRunning(true);
        setLogs([]);
        connectWebSocket(taskId);
        addToast("链接替换任务已启动！", "success");
        fetchHistory();
      } else {
        addToast("启动失败：" + JSON.stringify(res.data), "error");
      }
    } catch (err: any) {
      addToast("启动失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsGsActionRunning(false);
    }
  };

  // C: SOP Template Governance Functions
  const fetchSopTemplates = async () => {
    if (!selectedMobile) return;
    setIsSopLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/ops/sop/templates?mobile=${selectedMobile}`);
      setSopTemplates(res.data);
      setSelectedSopTemplateId('');
      setSopUrls([]);
      setSopCurUrl('');
      setSopNewUrl('');
    } catch (err: any) {
      addToast("获取SOP模板失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsSopLoading(false);
    }
  };

  const fetchSopUrls = async (tplId: number) => {
    if (!selectedMobile) return;
    setIsSopLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/ops/sop/template-urls?tpl_id=${tplId}&mobile=${selectedMobile}`);
      setSopUrls(res.data);
      if (res.data.length > 0) {
        setSopCurUrl(res.data[0].url);
      } else {
        setSopCurUrl('');
      }
    } catch (err: any) {
      addToast("获取SOP节点链接失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsSopLoading(false);
    }
  };

  const handleSopUpdate = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    if (!selectedSopTemplateId) return addToast("请选择要治理的SOP模板", "warning");

    setIsSopActionRunning(true);
    try {
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      const payload = {
        tpl_id: Number(selectedSopTemplateId),
        cur_url: sopCurUrl || undefined,
        new_url: sopNewUrl || undefined,
        title: sopTitle || undefined,
        image: sopImage || undefined,
        desc: sopDesc || undefined,
        auto_update: sopStyle !== 'Original',
        style: sopStyle === 'Original' ? 'Default' : sopStyle
      };

      const res = await axios.post(`${API_BASE}/api/ops/sop/update?mobile=${selectedMobile}`, payload);
      if (res.data.status === 'success') {
        addToast(`SOP 模板治理成功！已应用更新及随机打散方案`, "success");
        fetchSopUrls(Number(selectedSopTemplateId));
        setSopNewUrl('');
        setSopTitle('');
        setSopImage('');
        setSopDesc('');
      } else {
        addToast("治理失败：" + JSON.stringify(res.data), "error");
      }
    } catch (err: any) {
      addToast("SOP治理失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsSopActionRunning(false);
    }
  };

  // D: Customer Retention Report Functions
  const fetchRetentionReports = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    setIsReportsLoading(true);
    try {
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      const res = await axios.get(`${API_BASE}/api/ops/reports/retention?mobile=${selectedMobile}`);
      setRetentionReports(res.data);
      if (res.data.length === 0) {
        addToast("暂无企业授权或未拉取到留存数据", "info");
      } else {
        addToast(`留存数据拉取完毕，共 ${res.data.length} 家企业`, "success");
      }
    } catch (err: any) {
      addToast("获取留存分析失败: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setIsReportsLoading(false);
    }
  };


  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks`);
      setHistoryTasks(res.data);
    } catch (err) {
      console.error("Fetch history failed", err);
    }
  };

  const viewHistoryLogs = async (taskId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks/${taskId}/logs`);
      setHistoryLogs(res.data.logs);
      setShowHistoryLogs(true);
    } catch (err) {
      addToast("获取日志失败", "error");
    }
  };

  const deleteHistoryTask = async (taskId: string) => {
    if (!window.confirm("确定要删除这条任务记录吗？此操作不可撤销且会同步删除日志文件。")) return;
    try {
      await axios.delete(`${API_BASE}/api/tasks/${taskId}`);
      fetchHistory();
      addToast("任务已删除", "success");
    } catch (err) {
      addToast("删除失败", "error");
    }
  };

  const downloadHistoryLogs = async (taskId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks/${taskId}/logs`);
      const blob = new Blob([res.data.logs.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `automation-log-${taskId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast("下载日志失败", "error");
    }
  };

  const clearPersistence = () => {
    localStorage.removeItem('currentTaskId');
    localStorage.removeItem('previewTasks');
    localStorage.removeItem('selectedMobile');
  };

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
    if (liveConsoleRef.current) {
      liveConsoleRef.current.scrollTop = liveConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/sessions`);
      setSessions(res.data);
      if (res.data.length > 0) {
        setSelectedMobile(prev => {
          if (prev && res.data.some((s: any) => s.mobile === prev)) {
            return prev;
          }
          const savedMobile = localStorage.getItem('selectedMobile');
          if (savedMobile && res.data.some((s: any) => s.mobile === savedMobile)) {
            return savedMobile;
          }
          return res.data[0].mobile;
        });
      } else {
        setSelectedMobile('');
      }
    } catch (err) {
      console.error("Fetch sessions failed", err);
    }
  };

  const handleLogin = async () => {
    try {
      await axios.post(`${API_BASE}/api/auth/login`, { mobile, password });
      setMobile('');
      setPassword('');
      fetchSessions();
      addToast("登录授权成功", "success");
    } catch (err: any) {
      addToast("登录失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  const handleRevoke = async (mobile: string) => {
    if (!window.confirm(`确定要取消账号 ${mobile} 的授权吗？`)) return;
    try {
      await axios.delete(`${API_BASE}/api/auth/sessions/${mobile}`);
      fetchSessions();
      if (selectedMobile === mobile) setSelectedMobile('');
      addToast("授权已取消", "info");
    } catch (err: any) {
      addToast("取消授权失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/api/tasks/parse-excel`, formData);
      setPreviewTasks(res.data.tasks);
      localStorage.setItem('previewTasks', JSON.stringify(res.data.tasks));
      setActiveTab('task');
      addToast(`成功导入 ${res.data.tasks.length} 条任务`, "success");
    } catch (err: any) {
      addToast("上传失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  const startTask = async () => {
    if (!selectedMobile) return addToast("请先选择一个授权账号", "warning");
    if (previewTasks.length === 0) return addToast("请先上传 Excel 任务文件", "warning");

    try {
      // 1. 先检测授权是否过期
      const checkRes = await axios.get(`${API_BASE}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions(); // 刷新列表，过期账号会被后端自动删除
        setSelectedMobile('');
        setActiveTab('auth');
        return;
      }

      // 2. 授权有效，开始任务
      const res = await axios.post(`${API_BASE}/api/tasks/start?mobile=${selectedMobile}`, {
        tasks: previewTasks,
        concurrency: concurrency
      });
      const taskId = res.data.task_id;
      setCurrentTaskId(taskId);
      localStorage.setItem('currentTaskId', taskId);
      localStorage.setItem('selectedMobile', selectedMobile);
      localStorage.setItem('previewTasks', JSON.stringify(previewTasks));
      setIsTaskRunning(true);
      setLogs([]);
      connectWebSocket(taskId);
      addToast("自动化任务已启动", "success");
    } catch (err: any) {
      addToast("启动失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  const stopTask = async (taskId?: any) => {
    const resolvedId = (taskId && typeof taskId === 'string') ? taskId : currentTaskId;
    if (!resolvedId) return;
    try {
      await axios.post(`${API_BASE}/api/tasks/${resolvedId}/stop`);
      if (resolvedId === currentTaskId) {
        clearPersistence();
        setIsTaskRunning(false);
      }
      fetchHistory();
      addToast("任务已强制停止", "info");
    } catch (err: any) {
      addToast("停止失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  const connectWebSocket = (taskId: string) => {
    if (wsRef.current) wsRef.current.close();
    
    const ws = new WebSocket(`${WS_BASE}/api/ws/logs/${taskId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      setLogs(prev => [...prev, event.data]);
      if (event.data.includes("任务执行完毕") || event.data.includes("强制停止")) {
        setIsTaskRunning(false);
        clearPersistence();
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      // 只有在主动识别到结束时才设置 false，避免普通连接断开导致的按钮闪烁
    };
  };

  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-log-${currentTaskId}.txt`;
    a.click();
  };

  return (
    <>
    <div className="container">
      {isVerified === null ? (

        <div style={{display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)'}}>
          <div className="loading-spinner"></div>
          <span style={{marginLeft: '1rem'}}>系统初始化中...</span>
        </div>
      ) : !isVerified ? (
        <div style={{display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center'}}>
          <div className="card" style={{width: '100%', maxWidth: '400px', textAlign: 'center', padding: '3rem'}}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(168, 85, 247, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem'
            }}>
              <Key size={32} color="var(--accent-purple)" />
            </div>
            <h2 style={{marginBottom: '1rem'}}>系统授权验证</h2>
            <p style={{color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem'}}>请输入系统密钥以解锁自动化引擎核心功能</p>
            
            <div className="input-group" style={{textAlign: 'left'}}>
              <input 
                type="password" 
                value={secretKey} 
                onChange={e => setSecretKey(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleVerifySecret()}
                placeholder="请输入系统密钥"
                style={{letterSpacing: '0.2em'}}
              />
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{width: '100%', marginTop: '1rem'}} 
              onClick={handleVerifySecret}
              disabled={isVerifying}
            >
              {isVerifying ? '正在验证...' : '立即激活系统'}
            </button>
            
            <div style={{marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
              <ShieldCheck size={14} /> 安全加密验证系统
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="header">
            <h1 className="title">AUTOMATION ENGINE CORE</h1>
            <div className="status-group">
              {isTaskRunning && <span className="status-badge status-running">● 自动化执行中</span>}
              <button 
                className="btn btn-outline" 
                style={{marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444'}}
                onClick={handleLogout}
              >
                <LogOut size={16} style={{marginRight: '0.4rem'}} /> 退出系统
              </button>
            </div>
          </header>
          
          <div className="tab-bar">
            <div className={`tab ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>ACCESS AUTH</div>
            <div className={`tab ${activeTab === 'task' ? 'active' : ''}`} onClick={() => setActiveTab('task')}>FISSION CORE</div>
            <div className={`tab ${activeTab === 'ops' ? 'active' : ''}`} onClick={() => setActiveTab('ops')}>OPERATIONS CENTER</div>
          </div>


          {activeTab === 'auth' ? (
            <div className="grid">
              <div className="card">
            <h3><UserCheck size={20} /> 添加账号授权</h3>
            <div className="input-group">
              <label>手机号</label>
              <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="企微宝登录手机号" />
            </div>
            <div className="input-group">
              <label>密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="企微宝登录密码" />
            </div>
            <button className="btn btn-primary" onClick={handleLogin}>立即授权</button>
          </div>

          <div className="card">
            <h3>已授权列表</h3>
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
              {sessions.map(s => (
                <div key={s.mobile} className="session-item">
                  <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                    <span>账号：{s.mobile}</span>
                    <span style={{color: 'var(--text-dim)', fontSize: '0.9rem'}}>UID：<span style={{color: 'var(--accent-purple)', fontWeight: 600}}>{s.uid}</span></span>
                  </div>
                  <button 
                    className="btn btn-outline" 
                    style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)'}} 
                    onClick={() => handleRevoke(s.mobile)}
                  >
                    <Trash2 size={14} /> 取消授权
                  </button>
                </div>
              ))}
              {sessions.length === 0 && <p style={{color: 'var(--text-dim)', textAlign: 'center', padding: '2rem'}}>暂无授权账号</p>}
            </div>
          </div>
        </div>
      ) : activeTab === 'task' ? (
        <>
          {/* WORK TERMINAL Controls */}
          <div className="card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <select 
                  value={selectedMobile} 
                  onChange={e => setSelectedMobile(e.target.value)}
                  style={{width: '300px'}}
                >
                  <option value="">选择企微宝账号</option>
                  {sessions.map(s => <option key={s.mobile} value={s.mobile}>企微宝ID: {s.uid}</option>)}
                </select>
                <label className="btn btn-outline">
                  <Upload size={18} /> 上传 Excel
                  <input type="file" hidden onChange={handleFileUpload} accept=".xlsx,.xls" />
                </label>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem'}}>
                  <span style={{fontSize: '0.9rem', color: 'var(--text-dim)', whiteSpace: 'nowrap'}}>并发数:</span>
                  <select 
                    value={concurrency} 
                    onChange={e => setConcurrency(parseInt(e.target.value))}
                    style={{width: '80px', padding: '0.4rem'}}
                    disabled={isTaskRunning}
                  >
                    {[4, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                {!isTaskRunning ? (
                  <button className="btn btn-primary" onClick={startTask}>
                    <Play size={18} /> 开始执行
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopTask}>
                    <Square size={18} /> 强制停止
                  </button>
                )}
                <button className="btn btn-outline" onClick={downloadLogs} disabled={logs.length === 0}>
                   <Download size={18} /> 下载日志
                </button>
              </div>
            </div>

            {previewTasks.length > 0 && (
              <div style={{marginTop: '2rem'}}>
                <h4 style={{color: 'var(--accent-purple)', marginBottom: '1rem'}}>数据预览 ({previewTasks.length} 条任务)</h4>
                <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px'}}>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>发送人</th>
                        <th>智能标签</th>
                        <th>接收人</th>
                        <th>接收人是否为内部员工</th>
                        <th>起始位置</th>
                        <th>发送数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTasks.map((t, idx) => (
                        <tr key={idx}>
                          <td>{t.sender}</td>
                          <td>{t.tag}</td>
                          <td>{t.receiver}</td>
                          <td>{t.internal ? <span style={{color: 'var(--accent-cyan)'}}>是</span> : '否'}</td>
                          <td>{t.start}</td>
                          <td>{t.limit === -1 ? '全部' : t.limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{marginBottom: '1.5rem'}}>
              <Terminal size={20} /> 实时控制台
            </h3>
            <div className="console" ref={consoleRef}>
              {logs.map((log, i) => {
                let logClass = "log-info";
                if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
                else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
                
                return <div key={i} className={logClass}>{log}</div>;
              })}
              {logs.length === 0 && <div style={{color: 'var(--text-dim)', opacity: 0.5}}>等待任务启动... [SYSTEM READY]</div>}
            </div>
          </div>

          {/* TASK HISTORY (Merged from history tab) */}
          <div className="card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <h3>任务执行历史</h3>
              <button className="btn btn-outline" onClick={fetchHistory} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                 <Play size={14} /> 刷新列表
              </button>
            </div>

            <div style={{maxHeight: '600px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px'}}>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>任务 ID</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTasks.map(task => (
                    <tr key={task.id}>
                      <td style={{fontSize: '0.8rem', color: 'var(--accent-purple)'}}>{task.id}</td>
                      <td>
                        <span className={`status-badge ${task.status === 'completed' ? 'status-success' : task.status === 'running' ? 'status-running' : 'status-stopped'}`} 
                          style={{border: '1px solid transparent'}}>
                          {task.status === 'completed' ? '已完成' : task.status === 'running' ? '执行中' : '已停止'}
                        </span>
                      </td>
                      <td style={{fontSize: '0.8rem'}}>
                        {new Date(task.created_at + (task.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-CN', { 
                          timeZone: 'Asia/Shanghai',
                          hour12: false 
                        })}
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <button className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => viewHistoryLogs(task.id)}>
                            查看日志
                          </button>
                          <button className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => downloadHistoryLogs(task.id)}>
                            下载日志
                          </button>
                          <button className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)'}} onClick={() => deleteHistoryTask(task.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {historyTasks.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-dim)'}}>暂无历史任务记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showHistoryLogs && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              backdropFilter: 'blur(8px)'
            }}>
              <div className="card" style={{width: '90%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                  <h3>历史日志回溯</h3>
                  <button className="btn btn-outline" onClick={() => setShowHistoryLogs(false)}>关闭</button>
                </div>
                <div className="console" style={{flex: 1, height: 'auto', overflowY: 'auto'}}>
                  {historyLogs.map((log, i) => {
                    let logClass = "log-info";
                    if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
                    else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
                    return <div key={i} className={logClass}>{log}</div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
          /* 智能运营中心 Operations Center UI Panel */
          <div className="grid" style={{gridTemplateColumns: '1fr'}}>
            <div className="card">
              {/* Operations Center Sub-Tabs Navigation & Account Selector */}
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1.5rem', 
                borderBottom: '1px solid var(--border-glass)', 
                paddingBottom: '1.5rem', 
                marginBottom: '2rem'
              }}>
                <div className="sub-tab-bar" style={{marginBottom: 0}}>
                  <div 
                    className={`sub-tab ${opsSubTab === 'group-send' ? 'active' : ''}`} 
                    onClick={() => setOpsSubTab('group-send')}
                  >
                    📣 群发任务分发
                  </div>
                  <div 
                    className={`sub-tab ${opsSubTab === 'sop' ? 'active' : ''}`} 
                    onClick={() => setOpsSubTab('sop')}
                  >
                    ⚙️ SOP内容治理
                  </div>
                  <div 
                    className={`sub-tab ${opsSubTab === 'reports' ? 'active' : ''}`} 
                    onClick={() => setOpsSubTab('reports')}
                  >
                    📊 留存分析大盘
                  </div>
                  <div 
                    className={`sub-tab ${opsSubTab === 'stats' ? 'active' : ''}`} 
                    onClick={() => setOpsSubTab('stats')}
                  >
                    🏷️ 标签用户统计
                  </div>
                </div>

                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <span style={{fontSize: '0.9rem', color: 'var(--text-dim)'}}>授权账号:</span>
                  <select 
                    value={selectedMobile} 
                    onChange={e => setSelectedMobile(e.target.value)}
                    style={{width: '260px', padding: '0.5rem 1rem'}}
                  >
                    <option value="">选择企微宝账号</option>
                    {sessions.map(s => <option key={s.mobile} value={s.mobile}>企微宝ID: {s.uid}</option>)}
                  </select>
                </div>
              </div>

              {/* Guard: If no account is selected, prompt selection */}
              {!selectedMobile ? (
                <div style={{textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)'}}>
                  <ShieldCheck size={48} style={{opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem'}} />
                  <p style={{fontSize: '1.1rem', color: 'white', fontWeight: 600}}>请先选择授权账号以开启智能运营功能</p>
                  <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                    您可以在右上角的下拉菜单中选择一个已激活授权的企微宝账户来拉取实时数据
                  </p>
                </div>
              ) : (
                /* Sub-panel Switch */
                <>
                  {opsSubTab === 'group-send' && (
                    <div>
                      {/* Controls Row */}
                      <div className="card" style={{
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '16px'
                      }}>
                        <h4 style={{color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <Users size={18} /> 目标群发任务筛选
                        </h4>
                        <div style={{
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                          gap: '1.5rem', 
                          alignItems: 'flex-end'
                        }}>
                          <div className="input-group" style={{marginBottom: 0}}>
                            <label>群发模式</label>
                            <select 
                              value={gsModule} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                setGsModule(val);
                                fetchGsGroups(val);
                              }}
                            >
                              <option value={19}>极速群发模式 (新版)</option>
                              <option value={7}>高级群发模式</option>
                            </select>
                          </div>

                          <div className="input-group" style={{marginBottom: 0}}>
                            <label>任务分组</label>
                            <select 
                              value={selectedGsGroupId} 
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'ALL') {
                                  setSelectedGsGroupId('ALL');
                                  setSelectedGsTaskId('ALL');
                                } else {
                                  const numVal = val ? Number(val) : '';
                                  setSelectedGsGroupId(numVal);
                                  setSelectedGsTaskId('');
                                  if (numVal) {
                                    fetchGsTasks(numVal);
                                  }
                                }
                              }}
                            >
                              <option value="">请选择分组</option>
                              <option value="ALL">ALL (所有分组)</option>
                              {gsGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </div>

                          <div className="input-group" style={{marginBottom: 0}}>
                            <label>目标任务</label>
                            <select 
                              value={selectedGsTaskId} 
                              disabled={selectedGsGroupId === 'ALL'}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'ALL') {
                                  setSelectedGsTaskId('ALL');
                                } else {
                                  setSelectedGsTaskId(val ? Number(val) : '');
                                }
                              }}
                            >
                              {selectedGsGroupId === 'ALL' ? (
                                <option value="ALL">ALL (所有分组下的所有任务)</option>
                              ) : (
                                <>
                                  <option value="">请选择任务</option>
                                  <option value="ALL">ALL (当前分组下的所有任务)</option>
                                  {gsTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                </>
                              )}
                            </select>
                          </div>

                          <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button 
                              className="btn btn-outline" 
                              style={{height: '42px', width: '42px', padding: 0, minWidth: 'auto'}} 
                              onClick={() => {
                                fetchGsGroups();
                                if (selectedGsGroupId && selectedGsGroupId !== 'ALL') {
                                  fetchGsTasks(Number(selectedGsGroupId));
                                }
                              }}
                              disabled={isGsLoading}
                              title="刷新列表"
                            >
                              <RefreshCw className={isGsLoading ? "animate-spin" : ""} size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isGsLoading && (
                        <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-dim)'}}>
                          <div className="loading-spinner" style={{margin: '0 auto 1rem'}}></div>
                          <p>正在读取企微宝群发配置，请稍候...</p>
                        </div>
                      )}

                      {!isGsLoading && (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem'}}>
                          {/* Card A: 任务标题/封面自动随机更换 */}
                          <div className="card" style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <h4 style={{color: 'var(--accent-purple)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                🎨 1. 任务标题/封面自动随机更换
                              </h4>
                              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: '1.5'}}>
                                针对已筛选的目标群发任务，系统将利用智能防封打散算法自动且随机地更换任务标题与封面。选择 <strong>ALL</strong> 可一次性更新所有分组/任务。
                              </p>

                              <div className="input-group">
                                <label>打散风格类型</label>
                                <select 
                                  value={randomizeStyle} 
                                  onChange={e => setRandomizeStyle(e.target.value)}
                                >
                                  <option value="Default">都市爽文风格随机</option>
                                  <option value="Fantasy">玄幻奇幻风格随机</option>
                                </select>
                              </div>
                            </div>

                            <div style={{marginTop: '2rem'}}>
                              <button 
                                className="btn btn-primary" 
                                style={{width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
                                onClick={handleStartRandomize}
                                disabled={isGsActionRunning}
                              >
                                {isGsActionRunning ? (
                                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                                ) : (
                                  <><Play size={18} /> 启动随机更换任务</>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Card B: 链接批量替换 */}
                          <div className="card" style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <h4 style={{color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                🔗 2. 网页链接全局替换及防封打散
                              </h4>
                              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: '1.5'}}>
                                全局扫描所选范围下的所有任务，将指定的源链接（URL）替换为新链接，并可同时对被替换任务的标题及封面进行风格重塑。
                              </p>

                              <div className="input-group">
                                <label>待治理的源 URL (精确匹配)</label>
                                <input 
                                  type="text" 
                                  value={replaceSourceUrl} 
                                  onChange={e => setReplaceSourceUrl(e.target.value)} 
                                  placeholder="请输入待替换的旧网页链接，例如: http://old.domain.com/abc"
                                />
                              </div>

                              <div className="input-group">
                                <label>替换后的新 URL (支持域名自动解析)</label>
                                <input 
                                  type="text" 
                                  value={replaceNewUrl} 
                                  onChange={e => setReplaceNewUrl(e.target.value)} 
                                  placeholder="请输入替换后的新网页链接，例如: http://new.domain.com/xyz"
                                />
                              </div>

                              <div className="input-group">
                                <label>标题封面风格策略</label>
                                <select 
                                  value={replaceStyle} 
                                  onChange={e => setReplaceStyle(e.target.value)}
                                >
                                  <option value="Original">保持原版标题与封面 (仅替换链接)</option>
                                  <option value="Default">都市爽文风格随机更换</option>
                                  <option value="Fantasy">玄幻奇幻风格随机更换</option>
                                </select>
                              </div>
                            </div>

                            <div style={{marginTop: '2rem'}}>
                              <button 
                                className="btn btn-primary" 
                                style={{width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
                                onClick={handleStartReplacement}
                                disabled={isGsActionRunning}
                              >
                                {isGsActionRunning ? (
                                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                                ) : (
                                  <><Play size={18} /> 启动批量替换任务</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Asynchronous Operations Task History & Controls */}
                      <div className="card" style={{marginTop: '2rem', padding: '2rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <Terminal size={20} style={{color: 'var(--accent-cyan)'}} />
                            运营群发治理 - 历史任务列表
                          </h3>
                          <button className="btn btn-outline" onClick={fetchHistory} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>
                            <RefreshCw size={14} style={{marginRight: '0.4rem'}} /> 刷新记录
                          </button>
                        </div>

                        <div style={{overflowX: 'auto'}}>
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>任务标识</th>
                                <th>治理类型</th>
                                <th>启动时间</th>
                                <th>运行状态</th>
                                <th style={{textAlign: 'center'}}>管理操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyTasks.filter((t: any) => t.filename && t.filename.startsWith("运营群发治理")).map((task: any) => {
                                const isTaskRunningNow = task.status === 'running';
                                return (
                                  <tr key={task.id}>
                                    <td style={{fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)'}}>{task.id.substring(0, 8)}...</td>
                                    <td>
                                      <span style={{fontWeight: 600, color: 'white'}}>{task.filename}</span>
                                    </td>
                                    <td>{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                    <td>
                                      {task.status === 'running' && <span className="badge badge-cyan" style={{animation: 'pulse 2s infinite'}}>● 运行中</span>}
                                      {task.status === 'completed' && <span className="badge badge-success">已完成</span>}
                                      {task.status === 'stopped' && <span className="badge badge-gray">已停止</span>}
                                      {task.status === 'failed' && <span className="badge badge-danger">失败</span>}
                                    </td>
                                    <td style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                                      <button 
                                        className="btn btn-outline" 
                                        style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem'}}
                                        onClick={() => viewHistoryLogs(task.id)}
                                      >
                                        查看日志
                                      </button>
                                      <button 
                                        className="btn btn-outline" 
                                        style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--border-glass)'}}
                                        onClick={() => downloadHistoryLogs(task.id)}
                                      >
                                        导出日志
                                      </button>
                                      {isTaskRunningNow ? (
                                        <button 
                                          className="btn btn-danger" 
                                          style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem'}}
                                          onClick={() => stopTask(task.id)}
                                        >
                                          停止
                                        </button>
                                      ) : (
                                        <button 
                                          className="btn btn-outline" 
                                          style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444'}}
                                          onClick={() => deleteHistoryTask(task.id)}
                                        >
                                          删除
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {historyTasks.filter((t: any) => t.filename && t.filename.startsWith("运营群发治理")).length === 0 && (
                                <tr>
                                  <td colSpan={5} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-dim)'}}>
                                    暂无运营群发治理任务记录，您可在上方配置参数并启动治理任务。
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* sub-tab: C - SOP Content Governance */}
                  {opsSubTab === 'sop' && (
                    <div>
                      <div className="input-group" style={{marginBottom: '2rem'}}>
                        <select 
                          value={selectedSopTemplateId} 
                          onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : '';
                            setSelectedSopTemplateId(val);
                            if (val) fetchSopUrls(val);
                          }}
                        >
                          <option value="">-- 请选择 SOP 模板 --</option>
                          {sopTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      {isSopLoading && (
                        <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-dim)'}}>
                          <div className="loading-spinner" style={{margin: '0 auto 1rem'}}></div>
                          <p>正在拉取 SOP 模板节点详情，请稍候...</p>
                        </div>
                      )}

                      {!isSopLoading && selectedSopTemplateId && (
                        <div style={{marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem'}}>
                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem'}}>
                            {/* Left: Nodes Table */}
                            <div>
                              <h4 style={{color: 'var(--accent-purple)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <BookOpen size={20} /> 1. 模板详情清单 ({sopUrls.length} 个节点)
                              </h4>
                              <div style={{maxHeight: '554px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px'}}>
                                <table className="preview-table">
                                  <thead>
                                    <tr>
                                      <th style={{padding: '0.75rem'}}>时间节点</th>
                                      <th style={{padding: '0.75rem'}}>附件类型</th>
                                      <th style={{padding: '0.75rem'}}>原网页标题/URL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sopUrls.map((item, idx) => (
                                      <tr key={idx}>
                                        <td style={{padding: '0.75rem', fontWeight: 600}}>
                                          <span className="badge badge-purple">第 {item.day} 天</span>
                                        </td>
                                        <td style={{padding: '0.75rem'}}>
                                          <span className="badge badge-gray">{item.type}</span>
                                        </td>
                                        <td style={{padding: '0.75rem', maxWidth: '220px', wordBreak: 'break-all'}}>
                                          <div style={{fontWeight: 600, color: 'white', marginBottom: '0.2rem'}}>{item.title || '（未命名附件）'}</div>
                                          <div style={{fontSize: '0.75rem', color: 'var(--accent-cyan)'}}>{item.url}</div>
                                        </td>
                                      </tr>
                                    ))}
                                    {sopUrls.length === 0 && (
                                      <tr>
                                        <td colSpan={3} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-dim)'}}>
                                          该模板内无任何带有网页或小程序的SOP节点
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Right: Governance Actions */}
                            <div>
                              <h4 style={{color: 'var(--accent-pink)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <RefreshCw size={20} /> 2. 批量替换内容
                              </h4>

                              {sopUrls.length > 0 && (
                                <div className="input-group">
                                  <label>待治理的源 URL</label>
                                  <select 
                                    value={sopCurUrl} 
                                    onChange={e => setSopCurUrl(e.target.value)} 
                                    style={{marginBottom: '0.75rem'}}
                                  >
                                    {Array.from(new Set(sopUrls.map(u => u.url))).map((url, i) => (
                                      <option key={i} value={url}>{url}</option>
                                    ))}
                                  </select>
                                  <input 
                                    type="text" 
                                    value={sopCurUrl} 
                                    readOnly 
                                    placeholder="暂未选择源 URL"
                                    style={{backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'rgba(255, 255, 255, 0.4)', cursor: 'not-allowed', borderColor: 'rgba(255, 255, 255, 0.05)'}}
                                  />
                                </div>
                              )}

                              <div className="input-group">
                                <label>替换后新 URL</label>
                                <input 
                                  type="text" 
                                  value={sopNewUrl} 
                                  onChange={e => setSopNewUrl(e.target.value)} 
                                  placeholder="请输入新跳转的网页 URL (不填则仅批量更新属性)"
                                />
                              </div>

                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div className="input-group">
                                  <label>批量覆盖标题 (可选)</label>
                                  <input 
                                    type="text" 
                                    value={sopTitle} 
                                    onChange={e => setSopTitle(e.target.value)} 
                                    placeholder="留空则不覆盖"
                                  />
                                </div>

                                <div className="input-group">
                                  <label>批量覆盖描述 (可选)</label>
                                  <input 
                                    type="text" 
                                    value={sopDesc} 
                                    onChange={e => setSopDesc(e.target.value)} 
                                    placeholder="留空则不覆盖"
                                  />
                                </div>
                              </div>

                              <div className="input-group">
                                <label>批量覆盖封面图 URL (可选)</label>
                                <input 
                                  type="text" 
                                  value={sopImage} 
                                  onChange={e => setSopImage(e.target.value)} 
                                  placeholder="输入封面图 CDN 地址"
                                />
                              </div>

                              <div className="input-group" style={{marginBottom: '1.5rem'}}>
                                <label>标题风格</label>
                                <select value={sopStyle} onChange={e => setSopStyle(e.target.value)}>
                                  <option value="Original">原版标题（仅做链接治理）</option>
                                  <option value="Default">都市风格随机</option>
                                  <option value="Fantasy">玄幻风格随机</option>
                                </select>
                              </div>

                              <button 
                                className="btn btn-primary" 
                                style={{width: '100%', padding: '1rem'}} 
                                onClick={handleSopUpdate}
                                disabled={isSopActionRunning || sopUrls.length === 0}
                              >
                                {isSopActionRunning ? (
                                  <><Loader2 className="animate-spin" size={20} /> 正在执行治理算法...</>
                                ) : (
                                  <><RefreshCw size={20} /> 一键执行 SOP 内容深度治理</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isSopLoading && !selectedSopTemplateId && (
                        <div style={{textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)', border: '1px dashed var(--border-glass)', borderRadius: '16px', marginTop: '2rem'}}>
                          <BookOpen size={48} style={{opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem'}} />
                          <p style={{fontSize: '1.1rem', color: 'white'}}>请选择 SOP 模板进行治理</p>
                          <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                            系统支持从列表中选择账号内全部 SOP 模板，可视化列出全部跳转网页，提供一键批量防封及链接替换。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* sub-tab: D - Customer Retention Report */}
                  {opsSubTab === 'reports' && (
                    <div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                        <h4 style={{color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <BarChart2 size={20} /> 全企业留存分析看板
                        </h4>
                        <button 
                          className="btn btn-primary" 
                          onClick={fetchRetentionReports} 
                          disabled={isReportsLoading}
                        >
                          {isReportsLoading ? (
                            <><Loader2 className="animate-spin" size={16} /> 正在统计大盘...</>
                          ) : (
                            <><RefreshCw size={16} /> 刷新大盘留存分析</>
                          )}
                        </button>
                      </div>

                      {isReportsLoading && (
                        <div style={{textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)'}}>
                          <div className="loading-spinner" style={{margin: '0 auto 1.5rem'}}></div>
                          <p style={{fontSize: '1.1rem', color: 'white'}}>正在实时扫描已授权企业客户库...</p>
                          <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                            系统正在分别拉取每家企业的：正常关系客户、已流失关系客户、以及去重总好友数...
                          </p>
                        </div>
                      )}

                      {!isReportsLoading && retentionReports.length > 0 && (
                        <>
                          {/* Stats mini card grid */}
                          <div className="stats-card-grid">
                            <div className="stats-mini-card">
                              <h4>企业账户总数</h4>
                              <div className="value" style={{color: 'var(--accent-purple)'}}>{retentionReports.length} <span style={{fontSize: '1rem', fontWeight: 500}}>家</span></div>
                            </div>
                            <div className="stats-mini-card">
                              <h4>覆盖客户总量</h4>
                              <div className="value" style={{color: 'var(--accent-cyan)'}}>
                                {retentionReports.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} <span style={{fontSize: '1rem', fontWeight: 500}}>人</span>
                              </div>
                            </div>
                            <div className="stats-mini-card">
                              <h4>留存正常客户总量</h4>
                              <div className="value" style={{color: '#10b981'}}>
                                {retentionReports.reduce((acc, curr) => acc + curr.normal, 0).toLocaleString()} <span style={{fontSize: '1rem', fontWeight: 500}}>人</span>
                              </div>
                            </div>
                            <div className="stats-mini-card">
                              <h4>流失客户总量</h4>
                              <div className="value" style={{color: '#ef4444'}}>
                                {retentionReports.reduce((acc, curr) => acc + curr.lost, 0).toLocaleString()} <span style={{fontSize: '1rem', fontWeight: 500}}>人</span>
                              </div>
                            </div>
                          </div>

                          {/* Retention details list/grid */}
                          <h4 style={{color: 'var(--accent-cyan)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <Users size={20} /> 企业客户流失率与留存百分比排行
                          </h4>
                          <div className="retention-grid">
                            {([...retentionReports].sort((a, b) => b.retention_rate - a.retention_rate)).map((corp, index) => {
                              const churnRate = Math.max(0, 100 - corp.retention_rate).toFixed(2);
                              const isTopThree = index < 3;
                              const rankMedal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                              
                              return (
                                <div key={index} className={`retention-card ${isTopThree ? 'top-rank' : ''}`} style={{
                                  position: 'relative',
                                  border: isTopThree 
                                    ? index === 0 
                                      ? '1px solid rgba(234, 179, 8, 0.4)' 
                                      : index === 1 
                                        ? '1px solid rgba(148, 163, 184, 0.4)' 
                                        : '1px solid rgba(180, 83, 9, 0.4)' 
                                    : '1px solid var(--border-glass)',
                                  background: isTopThree
                                    ? index === 0 
                                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                                      : index === 1
                                        ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                                        : 'linear-gradient(135deg, rgba(180, 83, 9, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                                    : 'rgba(255, 255, 255, 0.02)',
                                  boxShadow: isTopThree 
                                    ? index === 0 
                                      ? '0 8px 32px 0 rgba(234, 179, 8, 0.08)'
                                      : index === 1 
                                        ? '0 8px 32px 0 rgba(148, 163, 184, 0.05)'
                                        : '0 8px 32px 0 rgba(180, 83, 9, 0.05)'
                                    : 'none'
                                }}>
                                  {isTopThree && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-10px',
                                      right: '12px',
                                      padding: '0.2rem 0.6rem',
                                      borderRadius: '20px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      background: index === 0 ? 'rgba(234, 179, 8, 0.2)' : index === 1 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(180, 83, 9, 0.2)',
                                      color: index === 0 ? '#facc15' : index === 1 ? '#cbd5e1' : '#fb923c',
                                      border: `1px solid ${index === 0 ? 'rgba(234, 179, 8, 0.3)' : index === 1 ? 'rgba(148, 163, 184, 0.3)' : 'rgba(180, 83, 9, 0.3)'}`
                                    }}>
                                      RANK {index + 1}
                                    </div>
                                  )}

                                  <div className="card-header" style={{alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.2rem'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                                      <span style={{
                                        fontSize: '1.2rem', 
                                        fontWeight: 700, 
                                        display: 'inline-flex',
                                        width: '32px',
                                        height: '32px',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                      }}>{rankMedal}</span>
                                      <span className="corp-name" style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                      }}>{corp.name}</span>
                                    </div>
                                  </div>

                                  <div style={{marginBottom: '1.5rem'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem'}}>
                                      <span style={{color: 'var(--text-dim)'}}>留存百分比:</span>
                                      <span style={{color: '#10b981', fontWeight: 700}}>{corp.retention_rate}%</span>
                                    </div>
                                    <div className="progress-bar-container" style={{height: '6px', marginBottom: '0.8rem'}}>
                                      <div 
                                        className="progress-bar-fill" 
                                        style={{
                                          width: `${corp.retention_rate}%`,
                                          background: 'linear-gradient(90deg, #818cf8, #10b981)'
                                        }}
                                      />
                                    </div>

                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem'}}>
                                      <span style={{color: 'var(--text-dim)'}}>流失百分比:</span>
                                      <span style={{color: '#ef4444', fontWeight: 700}}>{churnRate}%</span>
                                    </div>
                                    <div className="progress-bar-container" style={{height: '6px', background: 'rgba(255,255,255,0.05)'}}>
                                      <div 
                                        className="progress-bar-fill" 
                                        style={{
                                          width: `${churnRate}%`,
                                          background: 'linear-gradient(90deg, #f87171, #ef4444)'
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)'}}>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.2rem'}}>
                                      <span style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>正常客户数</span>
                                      <span style={{color: '#10b981', fontSize: '1rem', fontWeight: 700}}>{corp.normal.toLocaleString()}</span>
                                    </div>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.2rem'}}>
                                      <span style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>流失客户数</span>
                                      <span style={{color: '#ef4444', fontSize: '1rem', fontWeight: 700}}>{corp.lost.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  <div className="metrics-row" style={{borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.6rem', marginTop: '0.8rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between'}}>
                                    <span style={{color: 'var(--text-dim)'}}>去重总好友数:</span>
                                    <span style={{color: 'var(--accent-cyan)', fontWeight: 700}}>{corp.total.toLocaleString()} 人</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {!isReportsLoading && retentionReports.length === 0 && (
                        <div style={{textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)', border: '1px dashed var(--border-glass)', borderRadius: '16px'}}>
                          <BarChart2 size={48} style={{opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem'}} />
                          <p style={{fontSize: '1.1rem', color: 'white'}}>暂无大盘留存数据</p>
                          <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                            点击上方的“刷新大盘留存分析”按钮，系统将自动扫描拉取多企业并聚合分析生成留存看板。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* sub-tab: E - Tag User Statistics */}
                  {opsSubTab === 'stats' && (
                    <div>
                      {/* Controls Row */}
                      <div className="card" style={{
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '16px'
                      }}>
                        <h4 style={{color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <BarChart2 size={18} /> 企业标签用户统计查询
                        </h4>
                        
                        <div style={{
                          display: 'flex',
                          gap: '1.5rem',
                          alignItems: 'flex-end',
                          flexWrap: 'wrap'
                        }}>
                          <div className="input-group" style={{width: '280px', marginBottom: 0}}>
                            <label>企业简称</label>
                            <select value={selectedCorp} onChange={e => setSelectedCorp(e.target.value)}>
                              <option value="">请选择企业</option>
                              {corps.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          
                          <div className="input-group" style={{width: 'auto', marginBottom: 0}}>
                            <label>标签类型</label>
                            <div style={{
                              display: 'flex',
                              gap: '1.5rem',
                              height: '42px',
                              alignItems: 'center',
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              padding: '0 1.5rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-glass)'
                            }}>
                              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.9rem'}}>
                                <input type="radio" checked={tagType === 'smart'} onChange={() => setTagType('smart')} /> 智能标签
                              </label>
                              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.9rem'}}>
                                <input type="radio" checked={tagType === 'enterprise'} onChange={() => setTagType('enterprise')} /> 企业标签
                              </label>
                            </div>
                          </div>

                          <div className="input-group" style={{flex: 1, minWidth: '200px', marginBottom: 0}}>
                            <label>标签名称</label>
                            <div style={{position: 'relative'}}>
                              <input 
                                type="text" 
                                value={tagName} 
                                onChange={e => setTagName(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleQueryStats()}
                                placeholder="请输入完整的标签名字" 
                                style={{paddingRight: '2.5rem'}}
                              />
                              <Search size={18} style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3}} />
                            </div>
                          </div>

                          <button 
                            className="btn btn-primary" 
                            style={{height: '42px', padding: '0 2rem'}} 
                            onClick={handleQueryStats}
                            disabled={isStatsQuerying}
                          >
                            {isStatsQuerying ? (
                              <><Loader2 className="animate-spin" size={18} style={{marginRight: '0.5rem'}} /> 查询中...</>
                            ) : (
                              <><BarChart2 size={18} style={{marginRight: '0.5rem'}} /> 开始统计</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Results Card */}
                      <div style={{marginTop: '2rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem'}}>
                          <h4 style={{color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            📊 查询结果 {statsResults.length > 0 && <span style={{fontSize: '0.9rem', color: 'var(--text-dim)'}}>({statsResults.length} 条记录)</span>}
                          </h4>
                          {statsResults.length > 0 && (
                            <button className="btn btn-outline" style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem'}} onClick={() => {
                              const csv = ["员工名,标签名字,用户数", ...statsResults.map(r => `${r.employee_name},${r.tag_name},${r.user_count}`)].join('\n');
                              const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `stats-${selectedCorp}-${tagName}.csv`;
                              a.click();
                            }}>
                              <Download size={14} style={{marginRight: '0.4rem'}} /> 导出 CSV
                            </button>
                          )}
                        </div>
                        
                        <div style={{maxHeight: '500px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px'}}>
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>员工名</th>
                                <th>标签名字</th>
                                <th>用户数</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statsResults.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.employee_name}</td>
                                  <td>
                                    <span className="status-badge" style={{
                                      backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                                      color: 'var(--accent-purple)', 
                                      border: '1px solid rgba(168, 85, 247, 0.2)'
                                    }}>
                                      {item.tag_name}
                                    </span>
                                  </td>
                                  <td style={{fontWeight: 600, color: 'var(--accent-cyan)'}}>{item.user_count}</td>
                                </tr>
                              ))}
                              {statsResults.length === 0 && !isStatsQuerying && (
                                <tr>
                                  <td colSpan={3} style={{textAlign: 'center', padding: '4rem', color: 'var(--text-dim)'}}>
                                    <BarChart2 size={48} style={{opacity: 0.1, marginBottom: '1rem', margin: '0 auto 1rem'}} />
                                    <p>暂无统计数据，请在上方输入条件后点击开始统计</p>
                                  </td>
                                </tr>
                              )}
                              {isStatsQuerying && (
                                <tr>
                                  <td colSpan={3} style={{textAlign: 'center', padding: '4rem', color: 'var(--text-dim)'}}>
                                    <div className="loading-spinner" style={{margin: '0 auto 1rem'}}></div>
                                    <p>正在拉取企微宝数据，请稍候...</p>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>

  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        {t.type === 'success' && <CheckCircle size={20} />}
        {t.type === 'error' && <XCircle size={20} />}
        {t.type === 'warning' && <AlertCircle size={20} />}
        {t.type === 'info' && <Info size={20} />}
        <div className="toast-message">{t.message}</div>
      </div>
    ))}
  </div>
  </>
  );
  }
  export default App;
