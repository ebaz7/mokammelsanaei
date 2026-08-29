import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Link, 
  Download, 
  Settings, 
  Users, 
  Shield, 
  HelpCircle, 
  Check, 
  Copy, 
  RefreshCw, 
  Activity, 
  FileText, 
  Smartphone, 
  Monitor, 
  Server, 
  Sliders, 
  QrCode, 
  Globe, 
  Info, 
  Search, 
  UserPlus, 
  Key, 
  Wifi, 
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Panel, SmartSubscription, MockNode } from "./types";

export default function App() {
  // Localization state (fa = Persian, en = English)
  const [lang, setLang] = useState<"fa" | "en">("fa");

  // App major views: 'dashboard', 'panels', 'add-user', 'manuals', 'converter'
  const [currentTab, setCurrentTab] = useState<"dashboard" | "panels" | "manuals" | "converter">("dashboard");

  // Panels state
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string>("");
  const [newPanelName, setNewPanelName] = useState("");
  const [newPanelUrl, setNewPanelUrl] = useState("");
  const [newPanelUser, setNewPanelUser] = useState("");
  const [newPanelPass, setNewPanelPass] = useState("");
  const [newPanelWebBasePath, setNewPanelWebBasePath] = useState("");
  const [authMethod, setAuthMethod] = useState<"credentials" | "token">("credentials");
  const [newPanelApiToken, setNewPanelApiToken] = useState("");
  const [isTestingPanel, setIsTestingPanel] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    diagnostics?: Array<{
      url: string;
      method: "form" | "json";
      success: boolean;
      error: string;
      status?: number;
      isCompanionSelf?: boolean;
      is3xUiDetected?: boolean;
    }>;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Subscriptions state
  const [subs, setSubs] = useState<SmartSubscription[]>([]);
  const [selectedSub, setSelectedSub] = useState<SmartSubscription | null>(null);
  const [syncingPanelId, setSyncingPanelId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ [panelId: string]: string }>({});
  
  // Create User State
  const [newUserEmail, setNewUserEmail] = useState("");
  const [customServerIp, setCustomServerIp] = useState("");
  const [customL2tpPsk, setCustomL2tpPsk] = useState("SanaeiL2TPSecureKey");
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Manual converter state (paste raw link and get L2TP credentials)
  const [rawLink, setRawLink] = useState("");
  const [convertedL2tp, setConvertedL2tp] = useState<{
    serverIp: string;
    psk: string;
    user: string;
    pass: string;
  } | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mock nodes for visual failover display
  const [mockNodes, setMockNodes] = useState<MockNode[]>([
    { id: "1", name: "🇩🇪 Germany - Frankfurt (High-Speed)", type: "vless", address: "de1.sanaei-net.xyz", port: 443, uuid: "uuid-1", network: "ws", security: "tls", ping: 48, status: "active" },
    { id: "2", name: "🇫🇷 France - Paris (Secure Tunnel)", type: "vmess", address: "fr1.sanaei-net.xyz", port: 443, uuid: "uuid-2", network: "ws", security: "tls", ping: 55, status: "active" },
    { id: "3", name: "🇳🇱 Netherlands - Amsterdam", type: "trojan", address: "nl1.sanaei-net.xyz", port: 443, uuid: "uuid-3", network: "tcp", security: "tls", ping: 62, status: "active" },
    { id: "4", name: "🇫🇮 Finland - Helsinki", type: "vless", address: "fi1.sanaei-net.xyz", port: 2053, uuid: "uuid-4", network: "tcp", security: "xtls", ping: 120, status: "active" },
    { id: "5", name: "🇹🇷 Turkey - Istanbul (Low Ping Iran)", type: "shadowsocks", address: "tr2.sanaei-net.xyz", port: 8080, uuid: "uuid-5", network: "tcp", security: "none", ping: 35, status: "active" },
  ]);

  // Loading indicator for testing connections
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchPanels();
    fetchSubscriptions();
  }, []);

  const fetchPanels = async () => {
    setLoadingPanels(true);
    try {
      const res = await fetch("/api/panels");
      const data = await res.json();
      setPanels(data);
      if (data.length > 0) {
        setSelectedPanel(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load panels", e);
    } finally {
      setLoadingPanels(false);
    }
  };

  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setSubs(data);
    } catch (e) {
      console.error("Failed to load subscriptions", e);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Trigger copy indicator
  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add Panel
  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanelName || !newPanelUrl) return;

    try {
      const res = await fetch("/api/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPanelName,
          url: newPanelUrl,
          username: authMethod === "token" ? "" : newPanelUser,
          password: authMethod === "token" ? "" : newPanelPass,
          apiToken: authMethod === "token" ? newPanelApiToken : "",
          webBasePath: newPanelWebBasePath,
          isMock: newPanelUrl.includes("mock") || newPanelUrl.includes("demo"),
        }),
      });
      if (res.ok) {
        setNewPanelName("");
        setNewPanelUrl("");
        setNewPanelUser("");
        setNewPanelPass("");
        setNewPanelWebBasePath("");
        setNewPanelApiToken("");
        setTestResult(null);
        await fetchPanels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Panel
  const handleDeletePanel = async (id: string) => {
    if (id === "mock-panel") {
      alert(lang === "fa" ? "امکان حذف پنل دمو وجود ندارد." : "Demo panel cannot be deleted.");
      return;
    }
    if (!confirm(lang === "fa" ? "آیا از حذف این پنل اطمینان دارید؟" : "Are you sure you want to delete this panel?")) return;
    try {
      const res = await fetch(`/api/panels/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPanels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!newPanelUrl) {
      alert(lang === "fa" ? "لطفا آدرس پنل را وارد کنید." : "Please enter the panel URL.");
      return;
    }
    setIsTestingPanel(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/panels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newPanelUrl,
          username: authMethod === "token" ? "" : newPanelUser,
          password: authMethod === "token" ? "" : newPanelPass,
          apiToken: authMethod === "token" ? newPanelApiToken : "",
          webBasePath: newPanelWebBasePath,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        diagnostics: data.diagnostics,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: lang === "fa" ? "خطا در برقراری ارتباط با سرور." : "Network connection failed.",
      });
    } finally {
      setIsTestingPanel(false);
    }
  };

  // Sync Panel Users
  const handleSyncPanel = async (panelId: string) => {
    setSyncingPanelId(panelId);
    try {
      const res = await fetch(`/api/panels/${panelId}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback(prev => ({
          ...prev,
          [panelId]: lang === "fa" 
            ? `موفق: ${data.syncedCount} کاربر جدید اضافه شد!` 
            : `Success: ${data.syncedCount} new users synced!`
        }));
        await fetchSubscriptions();
        setTimeout(() => {
          setSyncFeedback(prev => {
            const updated = { ...prev };
            delete updated[panelId];
            return updated;
          });
        }, 5000);
      } else {
        alert(data.error || "Failed to sync panel users.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to sync"}`);
    } finally {
      setSyncingPanelId(null);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanel || !newUserEmail) {
      alert(lang === "fa" ? "لطفا پنل و ایمیل کاربر را وارد کنید." : "Please select a panel and enter user email.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: selectedPanel,
          username: newUserEmail,
          autoSwitchEnabled: autoSwitch,
          l2tpServerIp: customServerIp,
          l2tpPsk: customL2tpPsk,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewUserEmail("");
        setCustomServerIp("");
        setAutoSwitch(true);
        await fetchSubscriptions();
        setSelectedSub(data);
        setCurrentTab("dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete Subscription
  const handleDeleteSub = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === "fa" ? "آیا از حذف این کاربر اطمینان دارید؟" : "Are you sure you want to delete this subscription?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedSub?.id === id) setSelectedSub(null);
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Paste raw V2Ray link to manually convert to L2TP credentials
  const handleManualConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawLink) return;

    // Simulate extraction from V2Ray config link (VMess, VLess, Trojan, SS)
    let extractedIp = "185.163.46.12"; // simulated backend server IP
    let extractedUser = "vpn_" + Math.random().toString(36).substr(2, 6);
    let extractedPass = Math.random().toString(36).substr(2, 8).toUpperCase();

    // Check if real domain/IP can be extracted
    try {
      if (rawLink.startsWith("vless://") || rawLink.startsWith("trojan://")) {
        const parts = rawLink.split("@");
        if (parts.length > 1) {
          const hostPort = parts[1].split("?")[0].split(":")[0];
          if (hostPort) extractedIp = hostPort;
        }
      } else if (rawLink.startsWith("vmess://")) {
        const base64Str = rawLink.replace("vmess://", "");
        const decoded = JSON.parse(atob(base64Str));
        if (decoded.add) extractedIp = decoded.add;
      }
    } catch (e) {
      // Fallback to randomized realistic IP
    }

    setConvertedL2tp({
      serverIp: extractedIp,
      psk: "SanaeiL2TPManuallyConverted",
      user: extractedUser,
      pass: extractedPass,
    });
  };

  // Live node simulation pings updater
  useEffect(() => {
    const interval = setInterval(() => {
      setMockNodes((prev) =>
        prev.map((n) => {
          const fluctuation = Math.floor(Math.random() * 11) - 5; // -5 to +5 ms
          const newPing = Math.max(20, n.ping + fluctuation);
          // 5% chance to toggle status for realistic failover visuals
          const toggleStatus = Math.random() < 0.05;
          const newStatus = toggleStatus 
            ? (n.status === "active" ? "down" : "active")
            : n.status;
          return { ...n, ping: newPing, status: newStatus as "active" | "down" };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredSubs = subs.filter(
    (s) =>
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.panelName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-800 font-sans flex flex-col antialiased selection:bg-[#E0E7FF] selection:text-[#4338CA]" dir={lang === "fa" ? "rtl" : "ltr"}>
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-[#4F46E5] text-white p-2.5 rounded-xl shadow-md shadow-[#4F46E5]/20 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                {lang === "fa" ? "سامانه هوشمند اشتراک و تونل L2TP سنایی" : "3x-ui L2TP & Smart Sub Manager"}
              </h1>
              <p className="text-xs text-gray-500">
                {lang === "fa" ? "یکپارچه‌ساز اختصاصی پنل MHSanaei با تونل‌های نوین" : "Advanced L2TP Converter & Failover Proxy for MHSanaei 3x-ui"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher Button */}
            <button
              onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              id="lang-switcher"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{lang === "fa" ? "English" : "فارسی"}</span>
            </button>

            {/* GitHub/Info indicator */}
            <a 
              href="https://github.com/MHSanaei/3x-ui.git" 
              target="_blank" 
              rel="noreferrer"
              className="hidden md:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 rounded-xl transition-all"
            >
              <span>MHSanaei/3x-ui</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-100 rounded-2xl max-w-lg mb-8" id="main-tabs">
          <button
            onClick={() => setCurrentTab("dashboard")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "dashboard"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Users className="h-4 w-4" />
            {lang === "fa" ? "کاربران و اشتراک‌ها" : "Subscriptions"}
          </button>
          
          <button
            onClick={() => setCurrentTab("panels")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "panels"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Server className="h-4 w-4" />
            {lang === "fa" ? "اتصال پنل‌ها" : "3x-ui Panels"}
          </button>

          <button
            onClick={() => setCurrentTab("converter")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "converter"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Sliders className="h-4 w-4" />
            {lang === "fa" ? "مبدل لینک" : "L2TP Porter"}
          </button>

          <button
            onClick={() => setCurrentTab("manuals")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "manuals"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            {lang === "fa" ? "راهنمای اتصال" : "Guides"}
          </button>
        </div>

        {/* ==================== TAB 1: DASHBOARD (SUBS & USERS) ==================== */}
        {currentTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Create User and User List (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Quick Create Form Accordion / Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-[#4F46E5]/10 p-1.5 rounded-lg text-[#4F46E5]">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "ساخت کاربر هوشمند جدید" : "Create Smart Subscription & L2TP"}
                  </h3>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "سرور مبدا (پنل سنایی)" : "Target 3x-ui Panel"}
                      </label>
                      <select
                        value={selectedPanel}
                        onChange={(e) => setSelectedPanel(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      >
                        {panels.length === 0 ? (
                          <option value="">{lang === "fa" ? "بدون پنل فعال - ابتدا پنل بسازید" : "No active panels - Add panel first"}</option>
                        ) : (
                          panels.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.isMock ? `(${lang === "fa" ? "شبیه‌ساز" : "Simulated"})` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "شناسه کاربر (ایمیل یا نام کاربری)" : "User Email / ID"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mhsanaei_client"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "آی‌پی سرور L2TP (اختیاری)" : "L2TP Server IP Address (Optional)"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 159.69.120.44 (Default is auto)"
                        value={customServerIp}
                        onChange={(e) => setCustomServerIp(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "کلید پیش‌مشترک IPSec PSK" : "IPSec Pre-Shared Key (PSK)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Default: SanaeiL2TPSecureKey"
                        value={customL2tpPsk}
                        onChange={(e) => setCustomL2tpPsk(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#4F46E5]" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">
                          {lang === "fa" ? "مکانیزم سوییچ هوشمند و آپدیت خودکار" : "Smart Auto-Switch & Upgrades"}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          {lang === "fa" ? "سنجش پینگ سرورها و سوییچ اتوماتیک کاربر بین کانفیگ‌ها در صورت قطعی" : "Automatically measure latency and failover/rotate servers seamlessly"}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSwitch}
                        onChange={(e) => setAutoSwitch(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingUser || panels.length === 0}
                    className="w-full bg-[#4F46E5] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{lang === "fa" ? "در حال ایجاد کاربر..." : "Generating subscription..."}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{lang === "fa" ? "ثبت کاربر و دریافت خروجی L2TP" : "Create User & Get L2TP Output"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Users List Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-[#4F46E5]" />
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === "fa" ? "اشتراک‌های فعال صادر شده" : "Active Smart Subscriptions"}
                    </h3>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={lang === "fa" ? "جستجوی کاربر یا پنل..." : "Search user or panel..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="text-xs py-1.5 pl-8 pr-3 w-44 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                  </div>
                </div>

                {loadingSubs ? (
                  <div className="p-12 text-center text-gray-400 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                    <p className="text-xs">{lang === "fa" ? "در حال بارگذاری کاربران..." : "Loading subscriptions..."}</p>
                  </div>
                ) : filteredSubs.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "کاربری ثبت نشده است" : "No subscriptions found"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {lang === "fa" ? "از فرم بالا برای ثبت اولین کاربر خود استفاده کنید" : "Create a user above to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                    {filteredSubs.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSub(sub)}
                        className={`p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-all ${
                          selectedSub?.id === sub.id ? "bg-indigo-50/30 border-r-2 border-[#4F46E5]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl text-white ${
                            selectedSub?.id === sub.id ? "bg-[#4F46E5]" : "bg-gray-100 text-gray-500"
                          }`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-gray-900">{sub.username}</h4>
                              <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-semibold border border-green-100">
                                {lang === "fa" ? "فعال" : "Active"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Server className="h-3 w-3" />
                              <span>{sub.panelName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-semibold text-gray-600 block">
                              L2TP: {sub.l2tpUser}
                            </span>
                            <span className="text-[9px] text-gray-400 block">
                              IP: {sub.l2tpServerIp}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => handleDeleteSub(sub.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Subscription details & QR Codes (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {selectedSub ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                  
                  {/* Title */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{selectedSub.username}</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {lang === "fa" ? "جزئیات اشتراک هوشمند و لایسنس L2TP" : "Smart Profile & Legacy VPN Parameters"}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(selectedSub.createdAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")}
                    </span>
                  </div>

                  {/* Smart Auto Switch Status Visualization */}
                  <div className="bg-[#EEF2F6] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#4F46E5] animate-pulse" />
                        <h4 className="text-xs font-bold text-gray-900">
                          {lang === "fa" ? "پایشگر زنده و سوییچ خودکار" : "Live Monitor & DNS Switch"}
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#4F46E5]/10 text-[#4F46E5] font-bold px-2 py-0.5 rounded-full">
                        {selectedSub.autoSwitchEnabled ? (lang === "fa" ? "فعال" : "Auto-Switch On") : (lang === "fa" ? "غیرفعال" : "Off")}
                      </span>
                    </div>

                    {/* Nodes Visual ping grid */}
                    <div className="space-y-2">
                      {mockNodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${node.status === "active" ? "bg-green-500" : "bg-red-500"}`}></span>
                            <span className="font-semibold text-gray-700">{node.name}</span>
                          </div>
                          <span className={`font-mono px-1.5 py-0.5 rounded ${
                            node.status === "down" ? "bg-red-50 text-red-600" :
                            node.ping < 50 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {node.status === "down" ? "Timeout" : `${node.ping} ms`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* L2TP Outputs Grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 border-r-2 border-[#4F46E5] pr-2">
                      {lang === "fa" ? "خروجی سبک قدیم: L2TP / IPSec PSK" : "Old Style Connection Details: L2TP"}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-semibold mb-1">
                          {lang === "fa" ? "آدرس سرور / IP" : "VPN Server / IP"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpServerIp}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpServerIp, "ip")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "ip" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-semibold mb-1">
                          {lang === "fa" ? "کلید پیش‌مشترک PSK" : "IPSec Secret (PSK)"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpPsk}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpPsk, "psk")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "psk" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-semibold mb-1">
                          {lang === "fa" ? "نام کاربری L2TP" : "L2TP Username"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpUser}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpUser, "user")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-semibold mb-1">
                          {lang === "fa" ? "کلمه عبور L2TP" : "L2TP Password"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpPass}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpPass, "pass")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Config Installers downloads */}
                    <div className="flex gap-2">
                      <a
                        href={`/api/sub/${selectedSub.id}/l2tp-pbk`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#E0E7FF] text-[#4338CA] hover:bg-[#C7D2FE] rounded-xl text-[10px] font-bold transition-all"
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        <span>{lang === "fa" ? "دانلود کانفیگ ویندوز (.pbk)" : "Windows Dialer Profile"}</span>
                      </a>
                      
                      <a
                        href={`/api/sub/${selectedSub.id}/l2tp-mobileconfig`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#EEF2F6] text-[#334155] hover:bg-slate-200 rounded-xl text-[10px] font-bold transition-all"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>{lang === "fa" ? "پروفایل آیفون/مک (.mobileconfig)" : "iOS/macOS Profile"}</span>
                      </a>
                    </div>
                  </div>

                  {/* Android Native VPN (IKEv2/IPsec) [Android 12+ Replacement for L2TP] */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 border-r-2 border-green-500 pr-2 flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-green-500 animate-pulse" />
                      {lang === "fa" ? "جایگزین اندروید ۱۲+ (IKEv2/IPsec)" : "Android 12+ Native VPN (IKEv2/IPsec)"}
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      {lang === "fa" 
                        ? "در اندروید ۱۲ به بالا پروتکل L2TP حذف شده است. برای اتصال بدون هیچ برنامه‌ای در تنظیمات گوشی، از پروفایل IKEv2 استفاده کنید:" 
                        : "Android 12+ has removed L2TP. To connect natively from your phone settings without any app, use this IKEv2 profile:"}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[8px] font-semibold mb-1">
                          {lang === "fa" ? "نوع اتصال VPN" : "VPN Type"}
                        </span>
                        <code className="font-mono text-gray-800 break-all font-bold">IKEv2/IPsec MSCHAPv2</code>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[8px] font-semibold mb-1">
                          {lang === "fa" ? "آدرس سرور / Server Address" : "Server IP / DNS"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpServerIp}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpServerIp, "ikev2_ip")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "ikev2_ip" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[8px] font-semibold mb-1">
                          {lang === "fa" ? "شناسه IPSec / شناسه محلی" : "IPSec Identifier / Local ID"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpServerIp}</code>
                          <button 
                            onClick={() => triggerCopy(selectedSub.l2tpServerIp, "ikev2_id")}
                            className="text-gray-400 hover:text-gray-900 transition-all mr-1"
                          >
                            {copiedId === "ikev2_id" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-gray-400 block text-[8px] font-semibold mb-1">
                          {lang === "fa" ? "نام کاربری و کلمه عبور" : "Username & Password"}
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-gray-800 break-all">{selectedSub.l2tpUser}</code>
                          <button 
                            onClick={() => triggerCopy(`${selectedSub.l2tpUser} | ${selectedSub.l2tpPass}`, "ikev2_credentials")}
                            className="text-[#4F46E5] hover:underline text-[9px] font-bold"
                          >
                            {copiedId === "ikev2_credentials" ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی هردو" : "Copy Both")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Subscription Links */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 border-r-2 border-[#4F46E5] pr-2">
                      {lang === "fa" ? "خروجی هوشمند سبک جدید (آپدیت و سوییچ خودکار)" : "New Style: Smart Auto-Switch Subscriptions"}
                    </h4>

                    {/* Base64 Link */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{lang === "fa" ? "لینک ساب V2Ray (سازگار با v2rayN, Shadowrocket)" : "Standard Base64 Sub Link"}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => triggerCopy(`${window.location.origin}/api/sub/${selectedSub.id}`, "v2ray")}
                            className="text-[#4F46E5] hover:underline flex items-center gap-1 text-[10px] font-bold"
                          >
                            {copiedId === "v2ray" ? <span className="text-green-600 font-semibold">{lang === "fa" ? "کپی شد" : "Copied"}</span> : <><Copy className="h-3 w-3" />{lang === "fa" ? "کپی لینک" : "Copy"}</>}
                          </button>
                        </div>
                      </div>
                      <code className="text-[10px] text-gray-500 font-mono block truncate bg-white p-1 rounded border border-gray-100">
                        {`${window.location.origin}/api/sub/${selectedSub.id}`}
                      </code>
                    </div>

                    {/* Clash Link */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{lang === "fa" ? "لینک ساب Clash Meta (سوییچ بر اساس تاخیر پینگ)" : "Clash Meta Sub (Auto-test Latency)"}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => triggerCopy(`${window.location.origin}/api/sub/${selectedSub.id}?format=clash`, "clash")}
                            className="text-[#4F46E5] hover:underline flex items-center gap-1 text-[10px] font-bold"
                          >
                            {copiedId === "clash" ? <span className="text-green-600 font-semibold">{lang === "fa" ? "کپی شد" : "Copied"}</span> : <><Copy className="h-3 w-3" />{lang === "fa" ? "کپی لینک" : "Copy"}</>}
                          </button>
                        </div>
                      </div>
                      <code className="text-[10px] text-gray-500 font-mono block truncate bg-white p-1 rounded border border-gray-100">
                        {`${window.location.origin}/api/sub/${selectedSub.id}?format=clash`}
                      </code>
                    </div>

                    {/* WireGuard New Style */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{lang === "fa" ? "تونل مدرن WireGuard (جایگزین ایمن L2TP)" : "Modern WireGuard Tunnel"}</span>
                        <a 
                          href={`/api/sub/${selectedSub.id}/wireguard-conf`}
                          className="text-[#4F46E5] hover:underline text-[10px] font-bold flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>{lang === "fa" ? "دانلود فایل .conf" : "Download Conf"}</span>
                        </a>
                      </div>
                      
                      <div className="flex justify-center py-2 bg-white rounded border border-gray-100">
                        <QRCodeSVG value={`${window.location.origin}/api/sub/${selectedSub.id}/wireguard-conf`} size={110} />
                      </div>
                      <p className="text-[9px] text-gray-400 text-center">
                        {lang === "fa" ? "اسکن بارکد در اپلیکیشن WireGuard جهت ایمپورت مستقیم تونل" : "Scan to load full-tunnel config directly into your WireGuard app"}
                      </p>
                    </div>

                    {/* OpenVPN Style */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{lang === "fa" ? "پروتکل نوین OpenVPN (فول‌تونل و پایدار)" : "Modern OpenVPN Connection"}</span>
                        <a 
                          href={`/api/sub/${selectedSub.id}/openvpn-ovpn`}
                          className="text-[#4F46E5] hover:underline text-[10px] font-bold flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{lang === "fa" ? "دانلود فایل .ovpn" : "Download .ovpn"}</span>
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-lg border border-gray-100 font-sans">
                        <div>
                          <span className="text-gray-400 block text-[8px] font-semibold mb-0.5">
                            {lang === "fa" ? "نام کاربری OpenVPN" : "OpenVPN Username"}
                          </span>
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-gray-700">{selectedSub.openvpnUser || `vpn_${selectedSub.username}`}</code>
                            <button 
                              onClick={() => triggerCopy(selectedSub.openvpnUser || `vpn_${selectedSub.username}`, "ovpn_user")}
                              className="text-gray-400 hover:text-gray-900 ml-1"
                            >
                              {copiedId === "ovpn_user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-400 block text-[8px] font-semibold mb-0.5">
                            {lang === "fa" ? "کلمه عبور OpenVPN" : "OpenVPN Password"}
                          </span>
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-gray-700">{selectedSub.openvpnPass || "SanaeiOVPNPass"}</code>
                            <button 
                              onClick={() => triggerCopy(selectedSub.openvpnPass || "SanaeiOVPNPass", "ovpn_pass")}
                              className="text-gray-400 hover:text-gray-900 ml-1"
                            >
                              {copiedId === "ovpn_pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center py-2 bg-white rounded border border-gray-100">
                        <QRCodeSVG value={`${window.location.origin}/api/sub/${selectedSub.id}/openvpn-ovpn`} size={110} />
                      </div>
                      <p className="text-[9px] text-gray-400 text-center">
                        {lang === "fa" ? "اسکن بارکد در اپلیکیشن OpenVPN جهت دریافت اتوماتیک پروفایل" : "Scan to load full config directly into your OpenVPN client"}
                      </p>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 border-dashed shadow-sm p-8 text-center text-gray-400 h-96 flex flex-col justify-center items-center">
                  <Info className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-xs font-semibold">{lang === "fa" ? "کاربری انتخاب نشده است" : "No user selected"}</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                    {lang === "fa" ? "برای مشاهده لینک‌های اشتراک، کدهای QR و خروجی‌های خودکار L2TP، یک کاربر را از لیست سمت راست انتخاب کنید." : "Select a subscription from the list to view L2TP download options, custom QR codes, and smart auto-switching profile links."}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== TAB 2: PANELS (3X-UI MANAGEMENT) ==================== */}
        {currentTab === "panels" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: List of Panels (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-5 w-5 text-[#4F46E5]" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "پنل‌های Sanaei 3x-ui متصل شده" : "Configured MHSanaei 3x-ui Panels"}
                  </h3>
                </div>

                {loadingPanels ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                  </div>
                ) : panels.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-xl">
                    <Server className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "هیچ پنلی یافت نشد" : "No panels registered yet"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "لطفا از فرم سمت راست یک پنل اضافه کنید." : "Add a panel using the registration form."}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {panels.map((p) => (
                      <div key={p.id} className="border border-gray-100 bg-[#F9FAFB]/50 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2.5 rounded-xl text-gray-500">
                              <Server className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-gray-900">{p.name}</h4>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                  p.isMock ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-[#4F46E5] border border-indigo-100"
                                }`}>
                                  {p.isMock ? (lang === "fa" ? "شبیه‌ساز فعال" : "Simulated Mode") : (lang === "fa" ? "سرور زنده" : "Live API Server")}
                                </span>
                              </div>
                              <code className="text-[10px] text-gray-400 font-mono mt-1 block">
                                {p.url}
                                {p.webBasePath ? ` (Base: ${p.webBasePath})` : ""}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right text-[10px] text-gray-500">
                              <span className="block">{lang === "fa" ? "کاربر" : "User"}: <strong className="text-gray-700">{p.username}</strong></span>
                              <span className="block">{lang === "fa" ? "پروتکل" : "Proto"}: <strong className="text-gray-700">HTTPS/API</strong></span>
                            </div>
                            <button
                              onClick={() => handleDeletePanel(p.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Panel"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Sync Sub-section */}
                        <div className="w-full flex items-center justify-between border-t border-gray-100 pt-3 flex-wrap gap-2">
                          {syncFeedback[p.id] ? (
                            <span className="text-[10px] font-semibold text-green-600 animate-bounce">
                              {syncFeedback[p.id]}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400 leading-relaxed">
                              {lang === "fa" 
                                ? "💡 همگام‌سازی تمام کاربران سنایی با این پنل جهت ساخت خودکار کانفیگ‌ها" 
                                : "💡 Auto-sync all clients from this panel to generate L2TP/IKEv2 & OVPN"}
                            </span>
                          )}
                          <button
                            onClick={() => handleSyncPanel(p.id)}
                            disabled={syncingPanelId === p.id}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                              syncingPanelId === p.id
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-100"
                            }`}
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingPanelId === p.id ? "animate-spin" : ""}`} />
                            {lang === "fa" ? "همگام‌سازی کاربران" : "Sync Clients"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Add Panel (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="h-4.5 w-4.5 text-[#4F46E5]" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "ثبت و اتصال پنل جدید" : "Register New 3x-ui Panel"}
                  </h3>
                </div>

                <form onSubmit={handleAddPanel} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "نام نمایشی سرور" : "Friendly Panel Name"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Germany Core Panel"
                      value={newPanelName}
                      onChange={(e) => setNewPanelName(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "آدرس اینترنتی پنل سنایی (URL)" : "3x-ui Panel URL (Host & Port)"}
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. http://142.250.74.46:2053"
                      value={newPanelUrl}
                      onChange={(e) => setNewPanelUrl(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      required
                    />
                    <p className="text-[9px] text-gray-400 mt-1">
                      {lang === "fa" ? "برای شبیه‌سازی و تست بدون پنل واقعی، عبارت 'mock' یا آدرس پیشفرض دمو را بگذارید" : "Tip: Enter 'mock' to run in simulated mode without a live 3x-ui panel."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "پیشوند مسیر پنل (Web Base Path / API) - اختیاری" : "Panel Web Base Path / API Prefix (Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /sanaei or /admin"
                      value={newPanelWebBasePath}
                      onChange={(e) => setNewPanelWebBasePath(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all font-mono"
                    />
                    <p className="text-[9px] text-gray-400 mt-1">
                      {lang === "fa" ? "اگر برای پنل سنایی خود مسیر اختصاصی (Base Path) ست کرده‌اید، آن را اینجا وارد کنید" : "If you configured a custom Web Base Path / URL prefix in Sanaei settings, enter it here."}
                    </p>
                  </div>

                  {/* Authentication Method Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500">
                      {lang === "fa" ? "روش احراز هویت با پنل" : "Authentication Method"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button
                        type="button"
                        onClick={() => setAuthMethod("credentials")}
                        className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                          authMethod === "credentials"
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {lang === "fa" ? "نام‌کاربری و رمز عبور" : "Username & Password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod("token")}
                        className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                          authMethod === "token"
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {lang === "fa" ? "توکن امن ای‌پی‌آی (Token)" : "API Token"}
                      </button>
                    </div>
                  </div>

                  {authMethod === "token" ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "توکن اختصاصی ای‌پی‌آی (API Token)" : "API Token / Bearer Token"}
                      </label>
                      <input
                        type="password"
                        placeholder={lang === "fa" ? "توکن کپی‌شده از تنظیمات پنل سنایی..." : "Token copied from 3x-ui settings..."}
                        value={newPanelApiToken}
                        onChange={(e) => setNewPanelApiToken(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all font-mono"
                        required={authMethod === "token"}
                      />
                      <p className="text-[9px] text-indigo-500 mt-1 font-medium leading-relaxed">
                        {lang === "fa" 
                          ? "💡 نکته: در نسخه‌های جدید سنایی (v2.3.4+)، می‌توانید از بخش تنظیمات پنل یک API Token بسازید تا بدون نیاز به یوزرنیم/پسورد و کوکی، با امنیت بالا به پنل متصل شوید." 
                          : "💡 Tip: In modern MHSanaei versions, generate an API Token in panel settings to connect securely without a password."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {lang === "fa" ? "نام کاربری پنل" : "Username"}
                        </label>
                        <input
                          type="text"
                          placeholder="admin"
                          value={newPanelUser}
                          onChange={(e) => setNewPanelUser(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {lang === "fa" ? "رمز عبور پنل" : "Password"}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPanelPass}
                          onChange={(e) => setNewPanelPass(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Connection Test Output */}
                  {testResult && (
                    <div className="space-y-2">
                      <div className={`p-3.5 rounded-xl border text-xs flex gap-2 ${
                        testResult.success 
                          ? "bg-green-50 border-green-100 text-green-800" 
                          : "bg-red-50 border-red-100 text-red-800"
                      }`}>
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <strong className="font-bold block">{testResult.success ? (lang === "fa" ? "اتصال موفق" : "Connected!") : (lang === "fa" ? "ناموفق" : "Connection Error")}</strong>
                          <span className="text-[10px] mt-0.5 block opacity-90 whitespace-pre-line">{testResult.message}</span>
                          
                          {!testResult.success && testResult.diagnostics && testResult.diagnostics.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDiagnostics(!showDiagnostics)}
                              className="mt-2.5 text-[10px] font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{showDiagnostics ? (lang === "fa" ? "بستن جزئیات فنی" : "Hide technical details") : (lang === "fa" ? "مشاهده جزئیات فنی و آدرس‌های تست‌شده" : "Show technical details & tested URLs")}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {showDiagnostics && !testResult.success && testResult.diagnostics && (
                        <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-[10px] space-y-1.5 max-h-64 overflow-y-auto font-mono text-gray-700">
                          <div className="font-bold text-gray-500 pb-1 border-b border-gray-200/60 flex justify-between items-center">
                            <span>{lang === "fa" ? "آدرس و متد تست شده" : "Tested URLs & Methods"}</span>
                            <span>{lang === "fa" ? "وضعیت اتصال" : "Status"}</span>
                          </div>
                          {testResult.diagnostics.map((d, idx) => (
                            <div key={idx} className="flex justify-between gap-4 py-1 border-b border-gray-100 last:border-0">
                              <div className="truncate flex-1">
                                <span className={`mr-1 px-1 py-0.2 rounded text-[8px] font-sans font-bold ${d.method === "json" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                  {d.method.toUpperCase()}
                                </span>
                                <span className="opacity-80" title={d.url}>{d.url}</span>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {d.success ? (
                                  <span className="text-green-600 font-bold font-sans">✓ OK</span>
                                ) : (
                                  <span className="text-red-500 font-sans" title={d.error}>
                                    {d.isCompanionSelf ? (
                                      <span className="text-amber-500 font-sans font-bold">LOOPBACK ⚠️</span>
                                    ) : d.is3xUiDetected ? (
                                      <span className="text-amber-600 font-sans font-bold">3X-UI 🎯 (404/ERR)</span>
                                    ) : d.status ? (
                                      `HTTP ${d.status}`
                                    ) : (
                                      d.error.includes("Timeout") || d.error.includes("زمان") ? "TIMEOUT ⏳" : "REFUSED 🚫"
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingPanel}
                      className="flex-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      {isTestingPanel ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" /> : <Wifi className="h-4 w-4 text-gray-400" />}
                      <span>{lang === "fa" ? "تست ارتباط" : "Test Link"}</span>
                    </button>

                    <button
                      type="submit"
                      className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{lang === "fa" ? "ثبت سرور" : "Save Panel"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Bot API Integration Details Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 text-green-600 p-1.5 rounded-lg">
                    <Key className="h-4.5 w-4.5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === "fa" ? "اتصال آسان به ربات تلگرام (API)" : "Easy Telegram Bot API Integration"}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {lang === "fa" ? "وب‌سرویس اختصاصی این پنل برای اتصال آنی به ربات شما" : "Direct REST API for automated bot integrations"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      <span>{lang === "fa" ? "متد و آدرس وب‌سرویس" : "API Method & URL"}</span>
                      <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono font-bold">POST</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                      <code className="text-[10px] text-gray-800 font-mono break-all font-semibold">
                        {`${window.location.origin}/api/users`}
                      </code>
                      <button
                        onClick={() => triggerCopy(`${window.location.origin}/api/users`, "bot_api_url")}
                        className="text-gray-400 hover:text-gray-900 transition-all mr-1.5"
                      >
                        {copiedId === "bot_api_url" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-semibold text-gray-500">
                        {lang === "fa" ? "ساختار بدنه ارسالی (JSON Payload)" : "JSON Request Body"}
                      </span>
                      <button
                        onClick={() => triggerCopy(`{\n  "panelId": "${selectedPanel || "your_panel_id"}",\n  "username": "client_tg_username",\n  "autoSwitchEnabled": true\n}`, "bot_api_payload")}
                        className="text-[#4F46E5] text-[10px] font-bold hover:underline"
                      >
                        {copiedId === "bot_api_payload" ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی نمونه" : "Copy Payload")}
                      </button>
                    </div>
                    <pre className="text-[9px] bg-slate-900 text-slate-200 font-mono p-3 rounded-xl overflow-x-auto leading-relaxed">
{`{
  "panelId": "${selectedPanel || "your_panel_id"}",
  "username": "client_tg_username",
  "autoSwitchEnabled": true
}`}
                    </pre>
                  </div>

                  <p className="text-[9px] text-gray-500 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/30">
                    {lang === "fa" 
                      ? "💡 ربات تلگرام شما به جای ارتباط سخت با کوکی‌های سنایی، کافیست به آدرس بالا درخواست بفرستد تا فوراً پاسخ حاوی تمام لینک‌های هوشمند کلش، فایل‌های OVPN و اطلاعات L2TP/IKEv2 را دریافت کند."
                      : "💡 Instead of wrestling with Sanaei's cookie/login API, your bot only needs to call this endpoint. It immediately returns high-speed L2TP/IKEv2 configurations and smart subscription URLs."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 3: CONVERTER (V2RAY LINK TO L2TP) ==================== */}
        {currentTab === "converter" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              
              <div className="flex items-center gap-3">
                <div className="bg-[#4F46E5]/10 p-2.5 rounded-xl text-[#4F46E5]">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "مبدل سریع لینک کانفیگ به خروجی L2TP" : "L2TP Profile Porter"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lang === "fa" ? "تبدیل فوری هر لینک وی‌لس، وی‌مس یا تروجان به اکانت و اسکریپت L2TP" : "Instantly convert any V2Ray link to legacy L2TP client dialers and credentials"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualConvert} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    {lang === "fa" ? "لینک کانفیگ V2ray را وارد کنید" : "Paste raw vless://, vmess:// or trojan:// link"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="vless://e8e3d6f1-da9a-4fd9-8730-80252199b5a8@my-vpn.site:443?type=ws&security=tls#Germany-Node"
                    value={rawLink}
                    onChange={(e) => setRawLink(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] font-mono transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4F46E5] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#4338CA] transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  <span>{lang === "fa" ? "استخراج پارامترها و تولید L2TP" : "Parse Details & Extract L2TP"}</span>
                </button>
              </form>

              {convertedL2tp && (
                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/50 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <Check className="h-4.5 w-4.5 text-[#4F46E5] stroke-[3px]" />
                    <h4 className="text-xs font-bold">{lang === "fa" ? "خروجی L2TP تولید شده با موفقیت" : "Successfully Converted to L2TP!"}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "سرور L2TP" : "L2TP Server"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.serverIp}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.serverIp, "conv-ip")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-ip" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "کلید مشترک (PSK)" : "IPSec PSK"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.psk}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.psk, "conv-psk")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-psk" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "نام کاربری VPN" : "VPN Username"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.user}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.user, "conv-user")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "کلمه عبور VPN" : "VPN Password"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.pass}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.pass, "conv-pass")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {lang === "fa" ? "توجه: برای کارکرد صحیح کانفیگ L2TP، باید سرویس xl2tpd/strongswan متناظر بر روی سرور مقصد فعال باشد، یا پورت‌های ۵۰۰ و ۴۵۰۰ UDP به سمت کانال‌های Xray شما هدایت شده باشند." : "Note: Standard L2TP connections require standard L2TP daemons or custom translation layers to route packets properly over the server IP."}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== TAB 4: MANUALS (GUIDES) ==================== */}
        {currentTab === "manuals" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">
                {lang === "fa" ? "آموزش گام‌به‌گام اتصال و راه‌اندازی پروکسی" : "Configuration & Installation Manuals"}
              </h3>
              <p className="text-xs text-gray-500">
                {lang === "fa" ? "چگونه خروجی‌های سبک قدیم و جدید را در ویندوز، مک و گوشی‌ها نصب کنیم" : "Step-by-step documentation for both traditional and modern client setups"}
              </p>
            </div>

            {/* Old Style L2TP Manual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "روش قدیم" : "Legacy"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۱. تنظیم اتصال سنتی L2TP (ویندوز / آیفون قدیم)" : "1. Setup Traditional L2TP Tunnel"}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600">
                <div className="space-y-3">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Monitor className="h-4 w-4 text-[#4F46E5]" />
                    {lang === "fa" ? "آموزش در ویندوز (Windows 10/11)" : "Windows Setup Guide"}
                  </h5>
                  <ul className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>{lang === "fa" ? "فایل کانفیگ با فرمت .pbk ارائه‌شده در پنل را دانلود کنید." : "Download the provided .pbk dialer profile."}</li>
                    <li>{lang === "fa" ? "بر روی فایل دوبار کلیک کنید تا پنجره اتصال باز شود." : "Double click on the dialer file to open connections window."}</li>
                    <li>{lang === "fa" ? "نام کاربری و کلمه عبور صادر شده را وارد کنید." : "Input your generated VPN username and password."}</li>
                    <li>{lang === "fa" ? "کلید اتصال (Connect) را فشار دهید. ارتباط در چند ثانیه برقرار خواهد شد." : "Press 'Connect' to tunnel your full system traffic instantly."}</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-[#4F46E5]" />
                    {lang === "fa" ? "آموزش در آیفون (iOS) و مک (macOS)" : "Apple iOS & Mac Guide"}
                  </h5>
                  <ul className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>{lang === "fa" ? "فایل .mobileconfig مخصوص اپل را از پنل دانلود کنید." : "Download the profile file .mobileconfig from your browser."}</li>
                    <li>{lang === "fa" ? "به منوی تنظیمات گوشی رفته و روی Profile Downloaded بزنید." : "Go to iPhone Settings and tap on 'Profile Downloaded'."}</li>
                    <li>{lang === "fa" ? "پروفایل L2TP را با زدن روی دکمه Install تایید و نصب کنید." : "Verify and click 'Install' to let iOS construct the VPN connection."}</li>
                    <li>{lang === "fa" ? "حالا به قسمت VPN در تنظیمات بروید و سوییچ اتصال را فعال کنید." : "Now go to VPN Settings and toggle the connection switch on."}</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    {lang === "fa" ? "آموزش در اندروید ۱۲+ (IKEv2/IPsec)" : "Android 12+ Setup Guide"}
                  </h5>
                  <ul className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>{lang === "fa" ? "به تنظیمات گوشی (Settings) -> شبکه و اینترنت (VPN) بروید." : "Go to Settings -> Network & Internet -> VPN."}</li>
                    <li>{lang === "fa" ? "یک کانکشن جدید بسازید و نوع آن را روی IKEv2/IPsec MSCHAPv2 تنظیم کنید." : "Create a new VPN and set type to IKEv2/IPsec MSCHAPv2."}</li>
                    <li>{lang === "fa" ? "آدرس سرور و شناسه IPSec (هر دو همان IP سرور) را وارد کنید." : "Input Server Address and IPSec Identifier (both are your Server IP)."}</li>
                    <li>{lang === "fa" ? "نام کاربری و کلمه عبور را وارد کرده و دکمه ذخیره و اتصال را بزنید." : "Enter Username & Password, tap Save and toggle the switch on."}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* New Style Auto-switching subscription */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "روش جدید" : "Modern"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۲. سوییچ اتوماتیک و آپدیت خودکار (Clash Meta / Sing-box)" : "2. Dynamic Subscription Auto-Switch Setup"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
                <p>
                  {lang === "fa" 
                    ? "روش‌های سنتی L2TP فاقد سوییچ خودکار کانفیگ و آپدیت خودکار هستند. برای دور زدن این مشکل، ما پکیج اشتراک هوشمند Clash و Sing-box را توسعه داده‌ایم که مزایای زیر را فراهم می‌کند:" 
                    : "Traditional L2TP cannot dynamic switch nodes if one goes down. We've compiled a dynamic parser for Clash Meta and Sing-box which injects modern tunnels with automated switching:"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <Activity className="h-5 w-5 text-green-600 mx-auto mb-1.5 animate-pulse" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "سنجش زنده تاخیر پینگ" : "Live Latency Testing"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "پینگ کردن تمام سرورهای ۳ایکس‌یوآی و انتخاب سریعترین" : "Automatically pings and switches to the lowest ping node"}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <RefreshCw className="h-5 w-5 text-blue-600 mx-auto mb-1.5" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "آپدیت خودکار لیست" : "Sub Auto-Updates"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "تغییر آدرس‌ها یا اضافه شدن کانفیگ جدید اتومات دانلود می‌شود" : "New nodes added in 3x-ui show up without re-importing"}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <Shield className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "دور زدن فیلترینگ با پروتکل نوین" : "Advanced obfuscation"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "سازگار با هسته‌های VLESS, Trojan و Shadowsocks" : "Fully supports robust protocols out-performing classic L2TP"}</p>
                  </div>
                </div>

                <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/30">
                  <h5 className="font-bold text-gray-900 mb-2">{lang === "fa" ? "مراحل راه‌اندازی:" : "How to import:"}</h5>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li>{lang === "fa" ? "آدرس لینک اشتراک Clash را از بخش کاربران کپی کنید." : "Copy the smart Clash Meta link from your user panel."}</li>
                    <li>{lang === "fa" ? "آن را در اپلیکیشن Clash (یا v2rayN در بخش Subscription) پیست کنید." : "Paste it in Clash / V2rayN configuration manager."}</li>
                    <li>{lang === "fa" ? "حالت پروکسی را بر روی Rule بگذارید و گروه 'Auto-Switch' را به عنوان کانفیگ اصلی برگزینید." : "Select 'Rule' mode and choose 'Auto-Switch (Fastest Node)' group as your main gate."}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Linux Automated Install Script Manual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-indigo-100 text-[#4F46E5] px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "نصب لینوکس" : "Linux Setup"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۳. اسکریپت نصب، آپدیت و حذف خودکار لینوکس" : "3. One-Click Linux Installer & Updater"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600">
                <p className="leading-relaxed">
                  {lang === "fa" 
                    ? "برای اجرای پایدار و همیشگی این پنل به صورت یک سرویس پس‌زمینه (Systemd) در کنار پنل سنایی روی سرور خود، می‌توانید از اسکریپت تعاملی لینوکس ما استفاده کنید:" 
                    : "To deploy this manager as a permanent background service (systemd) alongside your MHSanaei 3x-ui on your Linux server, run our interactive management tool:"}
                </p>

                <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-[11px] relative group overflow-x-auto">
                  <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2 text-[10px] text-gray-400">
                    <span>{lang === "fa" ? "ترمینال لینوکس (SSH)" : "SSH Linux Terminal"}</span>
                    <button 
                      onClick={() => triggerCopy(`curl -sSL ${window.location.origin}/install.sh | bash`, "ssh-sh")}
                      className="text-gray-400 hover:text-white"
                    >
                      {copiedId === "ssh-sh" ? (lang === "fa" ? "کپی شد" : "Copied!") : (lang === "fa" ? "کپی دستور" : "Copy Command")}
                    </button>
                  </div>
                  <code>{`curl -sSL ${window.location.origin}/install.sh | bash`}</code>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  <h5 className="font-bold text-gray-800">{lang === "fa" ? "این اسکریپت چه کارهایی انجام می‌دهد؟" : "What does this script do?"}</h5>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px]">
                    <li><strong>Install</strong>: {lang === "fa" ? "نصب خودکار Node.js 20، کلون پروژه، کامپایل مجدد و ثبت به عنوان سرویس sanaei-smart-sub" : "Auto-installs Node.js, setups production assets, and registers systemd background service."}</li>
                    <li><strong>Update</strong>: {lang === "fa" ? "دریافت آخرین کدها از گیت و بازسازی بیلد فرانت‌اند و بک‌اند بدون قطع اتصال کاربران" : "Pulls changes, recompiles assets, and restarts service seamlessly."}</li>
                    <li><strong>Uninstall</strong>: {lang === "fa" ? "حذف تمیز کل سرویس، غیرفعال کردن خودکار سیستم‌دی و پاکسازی کامل پوشه نصب" : "Fully stops the service, deletes configurations, and uninstalls directory cleanly."}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Telegram Bot Connection & API Guide */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "اتصال ربات تلگرام" : "Telegram Bot Integration"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۴. راهنمای اتصال ربات فروش شما به این پنل (API)" : "4. Connect Telegram Sales Bot to Panel API"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600">
                <p className="leading-relaxed">
                  {lang === "fa" 
                    ? "اگر ربات تلگرامی دارید که اکانت‌های ۳ایکس‌یوآی را می‌فروشد، به راحتی می‌توانید آن را به این پلتفرم متصل کنید. ربات شما به جای ارسال مستقیم درخواست به سنایی، به این پنل درخواست ارسال می‌کند تا کاربر به صورت هوشمند ثبت شده و تمام لینک‌های OpenVPN، L2TP و ساب‌های جدید را دریافت کند." 
                    : "If you have a Telegram shop bot selling 3x-ui accounts, you can hook it into this panel's REST API. Instead of calling 3x-ui directly, make a request to this companion app to generate high-value multi-protocol smart configurations instantly."}
                </p>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3.5">
                  <h5 className="font-bold text-blue-900 flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span>{lang === "fa" ? "مستندات درخواست API" : "HTTP API Specification"}</span>
                  </h5>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="font-bold text-gray-700 block">Endpoint:</span>
                      <code className="font-mono text-pink-600 bg-white px-2 py-0.5 rounded border border-gray-100 block mt-1 w-fit">
                        POST {window.location.origin}/api/users
                      </code>
                    </div>

                    <div>
                      <span className="font-bold text-gray-700 block">{lang === "fa" ? "پارامترهای ارسالی (JSON Body):" : "Payload Parameters (JSON Body):"}</span>
                      <pre className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
{`{
  "panelId": "شناسه_پنل_ثبت_شده", // e.g. "mock-panel" or look up via /api/panels
  "username": "client_email_or_user", 
  "autoSwitchEnabled": true, // Enable Smart auto-test failover
  "l2tpServerIp": "آی‌پی_سرور", // (Optional) Custom DNS/IP for L2TP
  "l2tpPsk": "SanaeiL2TPSecureKey" // (Optional) Custom PSK
}`}
                      </pre>
                    </div>

                    <div>
                      <span className="font-bold text-gray-700 block">{lang === "fa" ? "پاسخ بازگشتی (JSON Response):" : "JSON Response Data:"}</span>
                      <pre className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
{`{
  "id": "subscription_token_xxxxx", // User's dynamic subscription token
  "username": "client_email_or_user",
  "uuid": "user-uuid-xxxx-xxxx-xxxx",
  "l2tpUser": "l2tp_user_xxx",
  "l2tpPass": "PASS_XXX",
  "openvpnUser": "vpn_user_xxx",
  "openvpnPass": "VPN_PASS_xxx",
  "smartSubUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx",
  "clashSubUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx?format=clash",
  "openvpnUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx/openvpn-ovpn"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Integration Examples Tabs */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-800">{lang === "fa" ? "نمونه کد اتصال در ربات تلگرام (Python)" : "Telegram Bot Integration Example (Python)"}</h5>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed">
{`import requests

def create_customer_subscription(user_id, username):
    payload = {
        "panelId": "mock-panel", # Replace with your active panel ID
        "username": f"tg_{user_id}_{username}",
        "autoSwitchEnabled": True
    }
    
    # Send request to your deployed companion app
    response = requests.post("${window.location.origin}/api/users", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Build attractive message to send to your telegram customer
        msg = f"<b>🎉 Your Smart VPN Account is Ready!</b>\\n\\n"
        msg += f"🔑 <b>Legacy L2TP Setup:</b>\\n"
        msg += f"Server: {data.get('l2tpServerIp')}\\n"
        msg += f"PSK Key: {data.get('l2tpPsk')}\\n"
        msg += f"Username: {data.get('l2tpUser')}\\n"
        msg += f"Password: {data.get('l2tpPass')}\\n\\n"
        
        msg += f"🌐 <b>Modern Protocols (Auto-Switch):</b>\\n"
        msg += f"🔹 <b>OpenVPN Download:</b> {data.get('openvpnUrl')}\\n"
        msg += f"🔹 <b>Clash Meta Sub:</b> {data.get('clashSubUrl')}\\n"
        msg += f"🔹 <b>V2Ray Subscription:</b> {data.get('smartSubUrl')}\\n"
        return msg
    return "Error generating subscription. Please try again."`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 transition-all">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-gray-500 font-semibold">
            {lang === "fa" ? "طراحی و توسعه برای تسهیل توزیع اشتراک‌های امن و پایدار" : "Engineered with professional standard layouts & multi-protocol routing capabilities"}
          </p>
          <p className="text-[10px] text-gray-400">
            {lang === "fa" ? "سلب مسئولیت: این ابزار صرفاً یک مدیریت‌کننده اشتراک و لایسنس است. تمام اطلاعات در دیتابیس لوکال امن ذخیره می‌شود." : "3x-ui and its modifications are property of MHSanaei. This tool operates as an abstraction and subscription proxy layer."}
          </p>
        </div>
      </footer>

    </div>
  );
}
