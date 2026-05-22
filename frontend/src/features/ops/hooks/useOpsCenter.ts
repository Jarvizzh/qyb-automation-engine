import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import type { 
  StatsItem, GroupItem, GroupTaskItem, 
  SopTemplateItem, SopUrlItem, RetentionReportItem 
} from '../../../types';

// Global cache for retention reports to survive unmounts (e.g. switching top-level tabs)
let globalRetentionReportsCache: RetentionReportItem[] = [];
let globalRetentionReportsLoadedMobile: string = '';

export const useOpsCenter = () => {
  const { selectedMobile, fetchSessions, setSelectedMobile, apiBase } = useSession();
  const { addToast } = useToast();
  const confirm = useConfirm();

  // Task History for Ops
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<string[]>([]);
  const [showHistoryLogs, setShowHistoryLogs] = useState(false);


  // A: Group-Send Governance States
  const [gsModule, setGsModule] = useState<number>(19); // 19: 极速群发, 7: 高级群发
  const [gsGroups, setGsGroups] = useState<GroupItem[]>([]);
  const [selectedGsGroupId, setSelectedGsGroupId] = useState<number | 'ALL' | ''>('');
  const [gsTasks, setGsTasks] = useState<GroupTaskItem[]>([]);
  const [selectedGsTaskId, setSelectedGsTaskId] = useState<number | 'ALL' | ''>('');
  const [randomizeStyle, setRandomizeStyle] = useState('Default');
  const [replaceSourceUrl, setReplaceSourceUrl] = useState('');
  const [replaceNewUrl, setReplaceNewUrl] = useState('');
  const [replaceStyle, setReplaceStyle] = useState('Original');
  const [isGsLoading, setIsGsLoading] = useState(false);
  const [isGsActionRunning, setIsGsActionRunning] = useState(false);

  // C: SOP Template Governance States
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

  // D: Customer Retention Report States
  const [retentionReports, setRetentionReports] = useState<RetentionReportItem[]>(globalRetentionReportsCache);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // Stats Tag States
  const [corps, setCorps] = useState<string[]>([]);
  const [selectedCorp, setSelectedCorp] = useState('');
  const [tagType, setTagType] = useState<'smart' | 'enterprise'>('smart');
  const [tagName, setTagName] = useState('');
  const [statsResults, setStatsResults] = useState<StatsItem[]>([]);
  const [isStatsQuerying, setIsStatsQuerying] = useState(false);

  // Fetch History for Operations
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks`);
      setHistoryTasks(res.data);
    } catch (err) {
      console.error("Fetch history failed", err);
    }
  };

  const viewHistoryLogs = async (taskId: string) => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks/${taskId}/logs`);
      setHistoryLogs(res.data.logs);
      setShowHistoryLogs(true);
    } catch (err) {
      addToast("获取日志失败", "error");
    }
  };

  const downloadHistoryLogs = async (taskId: string) => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks/${taskId}/logs`);
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

  const deleteHistoryTask = async (taskId: string) => {
    if (!await confirm({
      title: '删除任务记录',
      message: '确定要删除这条任务记录吗？此操作不可撤销且会同步删除日志文件。',
      confirmText: '确定删除',
      cancelText: '取消',
      type: 'danger'
    })) return;
    try {
      await axios.delete(`${apiBase}/api/tasks/${taskId}`);
      fetchHistory();
      addToast("任务已删除", "success");
    } catch (err) {
      addToast("删除失败", "error");
    }
  };

  const stopTask = async (taskId: string) => {
    try {
      await axios.post(`${apiBase}/api/tasks/${taskId}/stop`);
      fetchHistory();
      addToast("任务已强制停止", "info");
    } catch (err: any) {
      addToast("停止失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  // Stats Tag Functions
  const fetchCorps = async () => {
    if (!selectedMobile) return;
    try {
      const res = await axios.get(`${apiBase}/api/stats/corps?mobile=${selectedMobile}`);
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
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        return;
      }

      const res = await axios.post(`${apiBase}/api/stats/query?mobile=${selectedMobile}`, {
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

  // Group-Send Functions
  const fetchGsGroups = async (moduleVal?: number) => {
    const mod = moduleVal !== undefined ? moduleVal : gsModule;
    if (!selectedMobile) return;
    setIsGsLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/ops/group-send/groups?module=${mod}&mobile=${selectedMobile}`);
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
      const res = await axios.get(`${apiBase}/api/ops/group-send/tasks?module=${gsModule}&group_id=${groupId}&mobile=${selectedMobile}`);
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
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        return;
      }

      const payload = {
        task_type: 'title_randomize',
        module: gsModule,
        group_id: String(selectedGsGroupId),
        task_id: String(selectedGsTaskId),
        style: randomizeStyle
      };

      const res = await axios.post(`${apiBase}/api/ops/group-send/start-task?mobile=${selectedMobile}`, payload);
      if (res.data.status === 'success') {
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
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
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

      const res = await axios.post(`${apiBase}/api/ops/group-send/start-task?mobile=${selectedMobile}`, payload);
      if (res.data.status === 'success') {
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

  // SOP Functions
  const fetchSopTemplates = async () => {
    if (!selectedMobile) return;
    setIsSopLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/ops/sop/templates?mobile=${selectedMobile}`);
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
      const res = await axios.get(`${apiBase}/api/ops/sop/template-urls?tpl_id=${tplId}&mobile=${selectedMobile}`);
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
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
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

      const res = await axios.post(`${apiBase}/api/ops/sop/update?mobile=${selectedMobile}`, payload);
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

  // Retention Reports Function
  const fetchRetentionReports = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    setIsReportsLoading(true);
    try {
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        return;
      }

      const res = await axios.get(`${apiBase}/api/ops/reports/retention?mobile=${selectedMobile}`);
      setRetentionReports(res.data);
      globalRetentionReportsCache = res.data;
      globalRetentionReportsLoadedMobile = selectedMobile;
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

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (selectedMobile !== globalRetentionReportsLoadedMobile) {
      setRetentionReports([]);
      globalRetentionReportsCache = [];
      globalRetentionReportsLoadedMobile = '';
    } else {
      setRetentionReports(globalRetentionReportsCache);
    }
  }, [selectedMobile]);

  return {
    // History
    historyTasks,
    historyLogs,
    showHistoryLogs,
    setShowHistoryLogs,
    viewHistoryLogs,
    downloadHistoryLogs,
    deleteHistoryTask,
    stopTask,
    fetchHistory,

    // Group Send
    gsModule,
    setGsModule,
    gsGroups,
    selectedGsGroupId,
    setSelectedGsGroupId,
    gsTasks,
    selectedGsTaskId,
    setSelectedGsTaskId,
    randomizeStyle,
    setRandomizeStyle,
    replaceSourceUrl,
    setReplaceSourceUrl,
    replaceNewUrl,
    setReplaceNewUrl,
    replaceStyle,
    setReplaceStyle,
    isGsLoading,
    isGsActionRunning,
    fetchGsGroups,
    fetchGsTasks,
    handleStartRandomize,
    handleStartReplacement,

    // SOP
    sopTemplates,
    selectedSopTemplateId,
    setSelectedSopTemplateId,
    sopUrls,
    sopCurUrl,
    setSopCurUrl,
    sopNewUrl,
    setSopNewUrl,
    sopTitle,
    setSopTitle,
    sopImage,
    setSopImage,
    sopDesc,
    setSopDesc,
    sopStyle,
    setSopStyle,
    isSopLoading,
    isSopActionRunning,
    fetchSopTemplates,
    fetchSopUrls,
    handleSopUpdate,

    // Retention
    retentionReports,
    isReportsLoading,
    fetchRetentionReports,
    selectedMobile,

    // Stats Tag
    corps,
    selectedCorp,
    setSelectedCorp,
    tagType,
    setTagType,
    tagName,
    setTagName,
    statsResults,
    isStatsQuerying,
    fetchCorps,
    handleQueryStats
  };
};
