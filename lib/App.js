import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal, Pressable, Platform, StatusBar, FlatList, Switch, Alert } from "react-native";
import { SafeAreaProvider,SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CalculatorTab from "./calculator";
import Converter from "./converter";
import Finance from "./finance";
import { THEMES, THEME_OPTIONS, ThemeButton } from "./theme";

const HISTORY_KEY = "calc_history_data";
const RESTORE_KEY = "app_restore_pref";
const TABS_META_KEY = "app_saved_tabs_meta";
const APP_THEME = "app_theme";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const formatNumber = (val, maxDecimals = 2) => {
  if (val === null || val === undefined || val === "") return "";
  const n = parseFloat(val);
  if (isNaN(n)) return val; 
  return n.toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
};

const HistoryItem = React.memo(({ item, colors, formatNumber, onSelect, onRemoveItem }) => {
  const prefix = item.mode === 'finance' ? 'Fin' : (item.mode === 'conv' ? 'Conv' : 'Calc');
  const suffix = item.category || 'Stand';
  return (
    <View style={{ backgroundColor: colors.btn, borderRadius: 15, padding: 15, marginBottom: 10 }}>
      <TouchableOpacity 
        onPress={() => onSelect(item.expression, item.mode, item.category, item.data)} 
        style={{ flex: 1 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.secTxt, fontSize: 12 }}>{item.time}{'    '}{prefix}{' • '}{suffix}</Text>
        </View>
        <Text style={{ color: colors.txt, fontSize: 16, marginTop: 5 }}>{item.expression}</Text>
        <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "bold", textAlign: "right", marginTop: 5 }}>
          = {formatNumber(item.result, 2)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ position: "absolute", top: 10, right: 15 }} 
        onPress={() => onRemoveItem(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ color: "red", fontSize: 22, fontWeight: "bold" }}>×</Text>
      </TouchableOpacity>
    </View>
  );
});

const HistoryList = ({ history, colors, formatNumber, onRemoveItem, onClear, onSelect }) => {
  const reversedHistory = useMemo(() => history.slice().reverse(), [history]);
  const renderItem = useCallback(({ item }) => (
    <HistoryItem 
      item={item} 
      colors={colors} 
      formatNumber={formatNumber} 
      onSelect={onSelect} 
      onRemoveItem={onRemoveItem} 
    />
  ), [colors, formatNumber, onSelect, onRemoveItem]);

  const confirmClear = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: onClear }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.secTxt, fontWeight: 'bold' }}>HISTORY</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={confirmClear}>
            <Text style={{ color: 'red', fontWeight: 'bold' }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={reversedHistory}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color: colors.secTxt, textAlign: "center", marginTop: 50 }}>No history yet.</Text>}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
};

function App() {
  const [tabs, setTabs] = useState([{ id: Date.now(), name: "Tab 1" }]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [tabModes, setTabModes] = useState({});
  const [history, setHistory] = useState([]);
  const [showHist, setShowHist] = useState(false);
  const [pendingLoad, setPendingLoad] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [themeName, setThemeName] = useState("light");
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [restoreTabsEnabled, setRestoreTabsEnabled] = useState(false);
  
  const tabsListRef = useRef(null);
  
  // Ref to track if a tab has ANY data in ANY mode
  // Structure: { [tabId]: { calc: bool, conv: bool, finance: bool } }
  const tabUsageRef = useRef({}); 
  
  const colors = THEMES[themeName];

  useEffect(() => {
    const init = async () => {
      try {
        const [histJson, savedTheme, restorePref, savedMeta] = await Promise.all([
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(APP_THEME),
          AsyncStorage.getItem(RESTORE_KEY),
          AsyncStorage.getItem(TABS_META_KEY)
        ]);

        if (histJson) {
          const data = JSON.parse(histJson);
          const now = Date.now();
          setHistory(data.filter((item) => !item.timestamp || now - item.timestamp < ONE_YEAR_MS));
        }

        if (savedTheme && THEMES[savedTheme]) setThemeName(savedTheme);

        const shouldRestore = restorePref === "true";
        setRestoreTabsEnabled(shouldRestore);

        if (shouldRestore && savedMeta) {
               const { savedTabs, savedActiveId, savedModes } = JSON.parse(savedMeta);
                if (savedTabs && savedTabs.length > 0) {
                  setTabs(savedTabs);
                  setActiveId(savedActiveId);
                  setTabModes(savedModes);
               }
           }
         else { setTabModes(prev => ({ ...prev, [tabs[0].id]: "calc" })); }
      } catch (e) { console.error(e); } 
      finally { setIsReady(true); }
    };
    init();
  }, []);

  useEffect(() => {
    if (isReady) AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(console.error);
  }, [history, isReady]);

  useEffect(() => {
      if (isReady && restoreTabsEnabled) {
          const meta = { savedTabs: tabs, savedActiveId: activeId, savedModes: tabModes };
          AsyncStorage.setItem(TABS_META_KEY, JSON.stringify(meta)).catch(console.error);
      }
  }, [tabs, activeId, tabModes, restoreTabsEnabled, isReady]);

  useEffect(() => {
    if (!tabs.length || !activeId) return;
    const index = tabs.findIndex(t => t.id === activeId);
    if (index === -1) return;
    setTimeout(() => {
        tabsListRef.current?.scrollTo({ x: Math.max(0, (index * 90) - 120), animated: true });
    }, 0);
  }, [tabs, activeId]);

  // --- USAGE TRACKING ---
  // This is passed to children. They call it when inputs/results change.
  const handleReportUsage = useCallback((tabId, mode, isUsed) => {
    if (!tabUsageRef.current[tabId]) {
        tabUsageRef.current[tabId] = { calc: false, conv: false, finance: false };
    }
    tabUsageRef.current[tabId][mode] = isUsed;
  }, []);

  // --- FIND EMPTY TAB ---
  // A tab is empty only if NO mode (calc, conv, or finance) has data.
  const findEmptyTab = () => {
    return tabs.find(t => {
      const usage = tabUsageRef.current[t.id];
      if (!usage) return true; // No report yet = empty
      return !usage.calc && !usage.conv && !usage.finance;
    });
  };

  const toggleRestore = async (value) => {
      setRestoreTabsEnabled(value);
      await AsyncStorage.setItem(RESTORE_KEY, String(value));
      if (!value) await AsyncStorage.removeItem(TABS_META_KEY);
  };

  const changeTheme = (t) => { setThemeName(t); AsyncStorage.setItem(APP_THEME, t); setMenuVisible(false); };

  const addTab = () => {
    const usedNumbers = new Set(tabs.map(t => parseInt(t.name.split(' ')[1]) || 0));
    let newNum = 1;
    while (usedNumbers.has(newNum)) newNum++;
    const newTab = { id: Date.now(), name: `Tab ${newNum}` };
    setTabs((prev) => [...prev, newTab]);
    setActiveId(newTab.id);
    setTabModes((prev) => ({ ...prev, [newTab.id]: "calc" }));
    setShowHist(false);
    return newTab.id;
  };

  const handleRequestNewTab = (expr, mode, category, data = null) => {
    // 1. Determine Target Mode
    const targetMode = mode || (expr?.match(/^(EMI:|Stock Avg:|Reg Int:|Simple Int:|Compound Int:|SIP:|GST:)/) ? "finance" : expr?.match(/^(Age:|BMI:|Date Diff:|Time Zone:)| to /) ? "conv" : "calc");

    // 2. Check for empty tabs
    const emptyTab = findEmptyTab();
    
    // 3. Decide Target Tab ID
    let targetTabId;
    if (emptyTab) {
        targetTabId = emptyTab.id;
        setActiveId(targetTabId); // Switch to the existing empty tab
    } else {
        targetTabId = addTab(); // Create new if all are busy
    }

    // 4. Set Mode and Queue Data Load
    setTabModes(prev => ({ ...prev, [targetTabId]: targetMode }));
    setShowHist(false);
    setPendingLoad({ targetTabId, mode: targetMode, expression: expr, category, data });
  };

  const closeTab = (id) => {
    if (tabs.length === 1) return;
    delete tabUsageRef.current[id];
    const rem = tabs.filter((t) => t.id !== id);
    setTabs(rem);
    if (id === activeId) setActiveId(rem.at(-1).id);
    AsyncStorage.removeItem(`@tab_data_${id}_calc`).catch(() => {}); 
    AsyncStorage.removeItem(`@tab_data_${id}_conv`).catch(() => {}); 
    AsyncStorage.removeItem(`@tab_data_${id}_fin`).catch(() => {}); 
  };

  const addHistory = (exp, res, mode = "calc", category = null, data = null) => {
    const now = Date.now();
    const time = new Date(now).toLocaleString("en-US", { hour: "numeric", minute: "numeric", second: "numeric", hour12: true, month: "short", day: "numeric", }).toLowerCase();
    const newEntry = { id: now + Math.random(), expression: exp, result: res, time, timestamp: now, mode, category, data };
    setHistory((prev) => {
      const cleanHistory = prev.filter((item) => item.expression !== exp);
      return [...cleanHistory, newEntry];
    });
  };

  const getMode = (id) => tabModes[id] || "calc";
  const setMode = (id, mode) => setTabModes((prev) => ({ ...prev, [id]: mode }));
  const isLightTheme = ['light', 'natureGreen'].includes(themeName);

  if (!isReady) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={colors.bg} translucent={true} />

      {/* --- HEADER --- */}
      <View style={{ flexDirection: "row", height: 50, backgroundColor: colors.nav, alignItems: "center", paddingHorizontal: 10 }}>
        <ScrollView 
          horizontal 
          style={{ flex: 1 }} 
          showsHorizontalScrollIndicator={false}
          ref={tabsListRef}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 }, activeId === tab.id ? { backgroundColor: colors.accent } : { backgroundColor: colors.subTab }]}
              onPress={() => { setActiveId(tab.id); setShowHist(false); }}
            >
              <Text style={{ color: activeId === tab.id ? "white" : colors.secTxt, fontWeight: "600" }}>{tab.name}</Text>
              {tabs.length > 1 && ( <TouchableOpacity onPress={() => closeTab(tab.id)} style={{ marginLeft: 6 }}><Text style={{ color: "red", fontSize: 16, fontWeight: "bold" }}>×</Text></TouchableOpacity> )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={{ paddingHorizontal: 10, marginLeft: 4 }} onPress={() => setShowHist(!showHist)}>
          <Text style={{ color: showHist ? colors.accent : colors.secTxt, fontWeight: "bold" }}>{showHist ? "Back" : "Hist"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ paddingHorizontal: 10, marginLeft: 4 }} onPress={() => addTab()}>
          <Text style={{ color: colors.accent, fontSize: 24, fontWeight: "bold", marginTop: -2 }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ paddingHorizontal: 10, marginLeft: 4 }} onPress={() => setMenuVisible(true)}>
          <Text style={{ color: colors.txt, fontSize: 22 }}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODE SWITCHER --- */}
      {!showHist && (
        <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 10, gap: 10 }}>
          {["calc", "conv", "finance"].map((m) => (
             <TouchableOpacity key={m} onPress={() => setMode(activeId, m)} style={[{ paddingHorizontal: 20, paddingVertical: 6, borderRadius: 15 }, getMode(activeId) === m ? { backgroundColor: colors.accent } : { backgroundColor: colors.subTab }]}>
                <Text style={{ color: getMode(activeId) === m ? "white" : colors.secTxt, fontWeight: "bold", textTransform: 'capitalize' }}>{m === 'conv' ? 'Conv' : m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* --- TABS RENDERING --- */}
      <View style={{ flex: 1 }}>
        {tabs.map((tab) => {
          if (!tab) return null;
          const isTabActive = tab.id === activeId;
          const commonProps = {
            tabId: tab.id,
            colors: colors,
            pendingLoad: pendingLoad,
            showHistory: showHist,
            globalHistory: history,
            setShowHistory: setShowHist,
            HistoryList: HistoryList,
            onClear: () => setHistory([]),
            formatNumber: formatNumber,
            onConsumeLoad: () => setPendingLoad(null),
            onRequestNewTab: handleRequestNewTab,
            onRemoveItem: (id) => setHistory((p) => p.filter((i) => i.id !== id)),
            reportUsage: handleReportUsage,
          };
          return (
            <View key={tab.id} style={{ flex: 1, display: isTabActive ? "flex" : "none" }}>
              <View style={{ flex: 1, display: getMode(tab.id) === 'calc' ? 'flex' : 'none' }}>
                <CalculatorTab {...commonProps} isActive={isTabActive && getMode(tab.id) === 'calc'} onCalculate={addHistory} />
              </View>
              <View style={{ flex: 1, display: getMode(tab.id) === 'conv' ? 'flex' : 'none' }}>
                <Converter {...commonProps} isActive={isTabActive && getMode(tab.id) === 'conv'} onSave={addHistory} />
              </View>
              <View style={{ flex: 1, display: getMode(tab.id) === 'finance' ? 'flex' : 'none' }}>
                <Finance {...commonProps} isActive={isTabActive && getMode(tab.id) === 'finance'} onSave={addHistory} />
              </View>
            </View>
          );
        })}
      </View>
      
      {/* --- THEME MENU MODAL --- */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.1)" }} onPress={() => setMenuVisible(false)}>
          <View style={{ position: "absolute", top: Platform.OS === 'android' ? 60 : 100, right: 10, backgroundColor: colors.menuBg, borderRadius: 10, padding: 5, width: 180 }}>
            <Text style={{ color: colors.secTxt, padding: 10, fontSize: 12 }}>SELECT THEME</Text>
            {THEME_OPTIONS.map((t) => ( <ThemeButton key={t.key} item={t} isSelected={themeName === t.key} colors={colors} onPress={changeTheme} /> ))}
            <TouchableOpacity style={{ padding: 12, marginTop: 5 }} onPress={() => { setMenuVisible(false); setSettingsVisible(true); }}>
              <Text style={{ color: colors.txt, fontWeight: "bold" }}>⚙ Settings</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.menuBg, padding: 30, borderRadius: 20, width: "80%", alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.txt, marginBottom: 20 }}>Settings</Text>
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: colors.subTab, padding: 15, borderRadius: 12 }}>
                <View style={{flex: 1}}>
                    <Text style={{ color: colors.txt, fontSize: 16, fontWeight: 'bold' }}>Restore Tabs</Text>
                    <Text style={{ color: colors.secTxt, fontSize: 12, marginTop: 4 }}>Reopen last used tabs and data on startup.</Text>
                </View>
                <Switch value={restoreTabsEnabled} onValueChange={toggleRestore} trackColor={{ false: "#767577", true: colors.accent }} thumbColor={"#f4f3f4"} />
            </View>
            <Text style={{ color: colors.txt, marginBottom: 10 }}>Developer:</Text>
            <Text style={{ fontSize: 18, color: colors.accent, fontWeight: "bold", marginBottom: 30 }}>Nagalla Sivakumar</Text>
            <TouchableOpacity style={{ backgroundColor: colors.subTab, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 }} onPress={() => setSettingsVisible(false)}>
              <Text style={{ color: "red", fontSize: 16, fontWeight: "bold" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function AppWrapper() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}