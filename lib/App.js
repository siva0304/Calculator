import { useState, useEffect } from "react";
import { 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Pressable, 
  Platform, 
  StatusBar 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CalculatorTab from "./calculator";
import Converter from "./converter";
import Finance from "./finance";
import { THEMES, THEME_OPTIONS } from "./theme";

const HISTORY_KEY = "calc_history_data";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// --- CENTRALIZED FEATURE: Number Formatting (Indian System) ---
const formatNumber = (val, maxDecimals = 2) => {
  if (val === null || val === undefined || val === "") return "";
  const n = parseFloat(val);
  if (isNaN(n)) return val; 
  return n.toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
};

// --- SIMPLIFICATION: Component moved outside App to prevent re-renders ---
const ThemeButton = ({ item, isSelected, colors, onPress }) => (
  <TouchableOpacity
    style={{
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.subTab,
      flexDirection: "row",             // Row layout
      justifyContent: "space-between",  // Space between text and tick
      alignItems: "center",             // Center vertically
    }}
    onPress={() => onPress(item.key)}
  >
    <Text style={{ color: colors.txt }}>
      {item.label}
    </Text>
    
    {/* Green Tick Logic */}
    {isSelected && (
      <Text style={{ color: "#32CD32", fontWeight: "bold", fontSize: 18 }}>
        ✓
      </Text>
    )}
  </TouchableOpacity>
);

export default function App() {
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
  const colors = THEMES[themeName];

  // Load history + theme
  useEffect(() => {
    const init = async () => {
      try {
        const histJson = await AsyncStorage.getItem(HISTORY_KEY);
        if (histJson) {
          const data = JSON.parse(histJson);
          const now = Date.now();
          setHistory(
            data.filter(
              (item) => !item.timestamp || now - item.timestamp < ONE_YEAR_MS
            )
          );
        }

        const savedTheme = await AsyncStorage.getItem("app_theme");
        if (savedTheme && THEMES[savedTheme]) setThemeName(savedTheme);
      } 
      catch (e) { console.error(e); } 
      finally { setIsReady(true); }
    };
    init();
  }, []);

  // Save history to storage
  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(
        console.error
      );
    }
  }, [history, isReady]);

  const changeTheme = (t) => {
    setThemeName(t);
    AsyncStorage.setItem("app_theme", t);
    setMenuVisible(false);
  };

  const addTab = () => {
    const usedNumbers = new Set(
      tabs
        .map((t) => {
          const match = t.name.match(/^Tab (\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n) => n !== null)
    );

    let newNum = 1;
    while (usedNumbers.has(newNum)) {
      newNum++;
    }

    const newTab = { id: Date.now(), name: `Tab ${newNum}` };
    setTabs((prev) => [...prev, newTab]);
    setActiveId(newTab.id);
    setTabModes((prev) => ({ ...prev, [newTab.id]: "calc" }));
    setShowHist(false);
    return newTab.id;
  };

  const handleRequestNewTab = (expr, isCurrentTabEmpty = false) => {
    let targetTabId = activeId;
    let targetMode = "calc";
    const isFinance = expr?.match(/^(EMI:|Stock Avg:|Reg Int:|Simple Int:|Compound Int:|SIP:|GST:)/);
    const isConv = expr?.match(/^(Age:)| to /);
    
    if (isFinance) {
      targetMode = "finance";
    } else if (isConv) {
      targetMode = "conv";
    }

    if (isCurrentTabEmpty) {
      setTabModes((prev) => ({ ...prev, [activeId]: targetMode }));
    } else {
      targetTabId = addTab();
      setTabModes((prev) => ({ ...prev, [targetTabId]: targetMode }));
    }

    setTimeout(() => {
      setPendingLoad({ targetTabId: targetTabId, expression: expr });
      setShowHist(false);
    }, 50);
  };

  const closeTab = (id) => {
    if (tabs.length === 1) return;
    const rem = tabs.filter((t) => t.id !== id);
    setTabs(rem);
    if (id === activeId) setActiveId(rem.at(-1).id);
  };

  const addHistory = (exp, res) => {
    const now = Date.now();
    const time = new Date(now)
      .toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      })
      .toLowerCase();

    setHistory((prev) => [
      ...prev,
      {
        id: now + Math.random(),
        expression: exp,
        result: res,
        time,
        timestamp: now,
      },
    ]);
  };

  const getMode = (id) => tabModes[id] || "calc";
  const setMode = (id, mode) => setTabModes((prev) => ({ ...prev, [id]: mode }));

  const isLightTheme = ['light', 'natureGreen'].includes(themeName);

  return (
    <SafeAreaView 
      style={{ 
        flex: 1, 
        backgroundColor: colors.bg, 
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 
      }}
    >
      <StatusBar 
        barStyle={isLightTheme ? "dark-content" : "light-content"} 
        backgroundColor={colors.bg}
        translucent={true} 
      />

      {/* Top Navigation Bar */}
      <View
        style={{
          flexDirection: "row",
          height: 50,
          backgroundColor: colors.nav,
          alignItems: "center",
          paddingHorizontal: 10,
        }}
      >
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                {
                  flexDirection: "row",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  marginRight: 8,
                },
                activeId === tab.id
                  ? { backgroundColor: colors.accent }
                  : { backgroundColor: colors.subTab },
              ]}
              onPress={() => {
                setActiveId(tab.id);
                setShowHist(false);
              }}
            >
              <Text
                style={{
                  color: activeId === tab.id ? "white" : colors.secTxt,
                  fontWeight: "600",
                }}
              >
                {tab.name}
              </Text>

              {tabs.length > 1 && (
                <TouchableOpacity
                  onPress={() => closeTab(tab.id)}
                  style={{ marginLeft: 6 }}
                >
                  <Text style={{ color: "white" }}>×</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={{ paddingHorizontal: 10, marginLeft: 4 }}
          onPress={() => setShowHist(!showHist)}
        >
          <Text
            style={{
              color: showHist ? colors.accent : colors.secTxt,
              fontWeight: "bold",
            }}
          >
            {showHist ? "Back" : "Hist"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ paddingHorizontal: 10, marginLeft: 4 }}
          onPress={() => addTab()}
        >
          <Text style={{ color: colors.accent, fontSize: 24, fontWeight: "bold", marginTop: -2 }}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ paddingHorizontal: 10, marginLeft: 4 }}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={{ color: colors.txt, fontSize: 22 }}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector (Calc / Conv / Finance) */}
      {!showHist && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginVertical: 10,
            gap: 10,
          }}
        >
          {["calc", "conv", "finance"].map((m) => (
             <TouchableOpacity
                key={m}
                onPress={() => setMode(activeId, m)}
                style={[
                { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 15 },
                getMode(activeId) === m
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.subTab },
                ]}
            >
                <Text
                style={{
                    color: getMode(activeId) === m ? "white" : colors.secTxt,
                    fontWeight: "bold",
                    textTransform: 'capitalize'
                }}
                >
                {m === 'conv' ? 'Conv' : m}
                </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {tabs.map((tab) => {
          if (!tab) return null;
          const isTabActive = tab.id === activeId; 
          
          return (
            <View
              key={tab.id}
              style={{ flex: 1, display: isTabActive ? "flex" : "none" }}
            >
              <View style={{ flex: 1, display: getMode(tab.id) === 'calc' ? 'flex' : 'none' }}>
                <CalculatorTab
                  tabId={tab.id}
                  isActive={isTabActive && getMode(tab.id) === 'calc'}
                  showHistory={showHist}
                  setShowHistory={setShowHist}
                  globalHistory={history}
                  onCalculate={addHistory}
                  onClear={() => setHistory([])}
                  onRemoveItem={(id) => setHistory((p) => p.filter((i) => i.id !== id))}
                  pendingLoad={pendingLoad}
                  onConsumeLoad={() => setPendingLoad(null)}
                  onRequestNewTab={handleRequestNewTab}
                  colors={colors}
                  formatNumber={formatNumber} 
                />
              </View>

              <View style={{ flex: 1, display: getMode(tab.id) === 'conv' ? 'flex' : 'none' }}>
                <Converter
                  tabId={tab.id}
                  isActive={isTabActive && getMode(tab.id) === 'conv'}
                  onSave={addHistory}
                  colors={colors}
                  showHistory={showHist}
                  globalHistory={history}
                  onClear={() => setHistory([])}
                  onRemoveItem={(id) => setHistory((p) => p.filter((i) => i.id !== id))}
                  onRequestNewTab={handleRequestNewTab}
                  pendingLoad={pendingLoad}
                  onConsumeLoad={() => setPendingLoad(null)}
                  setShowHistory={setShowHist}
                  formatNumber={formatNumber} 
                />
              </View>

              <View style={{ flex: 1, display: getMode(tab.id) === 'finance' ? 'flex' : 'none' }}>
                <Finance 
                    tabId={tab.id}
                    isActive={isTabActive && getMode(tab.id) === 'finance'}
                    onSave={addHistory}
                    colors={colors}
                    showHistory={showHist}
                    globalHistory={history}
                    onClear={() => setHistory([])}
                    onRemoveItem={(id) => setHistory((p) => p.filter((i) => i.id !== id))}
                    onRequestNewTab={handleRequestNewTab}
                    pendingLoad={pendingLoad}
                    onConsumeLoad={() => setPendingLoad(null)}
                    setShowHistory={setShowHist}
                    formatNumber={formatNumber} 
                  />
              </View>
            </View>
          );
        })}
      </View>

      {/* Theme Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.1)" }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              top: Platform.OS === 'android' ? 60 : 100, 
              right: 10,
              backgroundColor: colors.menuBg,
              borderRadius: 10,
              padding: 5,
              width: 180,
            }}
          >
            <Text style={{ color: colors.secTxt, padding: 10, fontSize: 12 }}>SELECT THEME</Text>
            
            {/* Render Externalized ThemeButton */}
            {THEME_OPTIONS.map((t) => (
              <ThemeButton 
                key={t.key} 
                item={t} 
                isSelected={themeName === t.key}
                colors={colors}
                onPress={changeTheme}
              />
            ))}

            <TouchableOpacity
              style={{ padding: 12, marginTop: 5 }}
              onPress={() => {
                setMenuVisible(false);
                setSettingsVisible(true);
              }}
            >
              <Text style={{ color: colors.txt, fontWeight: "bold" }}>⚙ Settings</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.menuBg,
              padding: 30,
              borderRadius: 20,
              width: "80%",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.txt, marginBottom: 20 }}>Settings</Text>
            <Text style={{ color: colors.txt, marginBottom: 10 }}>Developer:</Text>
            <Text style={{ fontSize: 18, color: colors.accent, fontWeight: "bold", marginBottom: 30 }}>Nagalla Sivakumar</Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.subTab,
                paddingVertical: 10,
                paddingHorizontal: 30,
                borderRadius: 20,
              }}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={{ color: colors.txt }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}