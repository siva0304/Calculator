import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Dimensions, Keyboard, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- PIE CHART COMPONENT ---
const PieChart2Segment = ({ radius = 80, percent, colorFilled, colorEmpty, totalValue, formatFn }) => {
  const pct = Math.min(Math.max(percent, 0), 1);
  const rightRotate = pct >= 0.5 ? 0 : (pct * 360) - 180;
  const leftRotate = pct >= 0.5 ? ((pct - 0.5) * 360) - 180 : -180;

  return (
    <View style={{ width: radius * 2, height: radius * 2, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: colorEmpty, position: 'absolute' }} />
      <View style={{ width: radius, height: radius * 2, position: 'absolute', right: 0, overflow: 'hidden' }}>
        <View style={{ width: radius, height: radius * 2, backgroundColor: colorFilled, borderTopRightRadius: radius, borderBottomRightRadius: radius,
           transform: [ { translateX: -radius / 2 }, { rotate: `${rightRotate}deg` }, { translateX: radius / 2 }, ]}} />
      </View>
      <View style={{ width: radius, height: radius * 2, position: 'absolute', left: 0, overflow: 'hidden' }}>
        <View style={{ width: radius, height: radius * 2, backgroundColor: colorFilled, borderTopLeftRadius: radius, borderBottomLeftRadius: radius,
           transform: [ { translateX: radius / 2 }, { rotate: `${leftRotate}deg` }, { translateX: -radius / 2 }, ]}} />
      </View>
      <View style={{ width: (radius * 2) * 0.65, height: (radius * 2) * 0.65, borderRadius: radius, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', position: 'absolute' }}>
          <Text style={{color:'#aaa', fontSize: 10}}>Total Value</Text>
          <Text style={{color:'#fff', fontSize: 14, fontWeight:'bold'}}>{formatFn ? formatFn(totalValue, 2) : totalValue}</Text>
      </View>
    </View>
  );
};

const CATEGORIES = ["EMI", "Interest", "Stocks", "SIP", "GST"];

const toFriendlyDate = (dateObj) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${dateObj.getDate()}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
};

export default function Finance(props) {
  const { 
    HistoryList, onSave, colors, showHistory, globalHistory, onClear, onRemoveItem, 
    onRequestNewTab, pendingLoad, onConsumeLoad, formatNumber, reportUsage, tabId
  } = props;
  
  const [category, setCategory] = useState("EMI");

  const [dataLoaded, setDataLoaded] = useState(false);
  
  // --- EMI STATE ---
  const [emiConfig, setEmiConfig] = useState({ amount: "", rate: "", tenure: "", tenureUnit: "Years" });
  const [emiResult, setEmiResult] = useState(null);
  
  // --- INTEREST STATE ---
  const [intType, setIntType] = useState("Regular"); 
  const [legacyConfig, setLegacyConfig] = useState({ principal: "", rate: "", time: "", cmpVal: "", cmpUnit: "Yearly" });
  const [intResult, setIntResult] = useState(null);
  
  const today = new Date();
  const initDateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()+1).padStart(2, '0')}-${today.getFullYear()}`;
  const [is30DayMode, setIs30DayMode] = useState(true);

  const [regConfig, setRegConfig] = useState({
      principal: "", rate: "2", rateUnit: "Monthly", start: initDateStr, end: initDateStr, nthVal: "", nthUnit: "Years"
  });
  const [regResult, setRegResult] = useState(null);

  // --- STOCKS STATE ---
  const [stockConfig, setStockConfig] = useState({ q1: "", p1: "", q2: "", p2: "" });
  const [stockResult, setStockResult] = useState(null);

  // --- SIP STATE ---
  const [sipConfig, setSipConfig] = useState({ investment: "", rate: "", years: "" });
  const [sipResult, setSipResult] = useState(null);

  // --- GST STATE ---
  const [gstConfig, setGstConfig] = useState({ amount: "", rate: "18" });
  const [isGstInclusive, setIsGstInclusive] = useState(false);
  const [gstResult, setGstResult] = useState(null);

    // --- RESTORE DATA ---
  useEffect(() => {
    const loadData = async () => {
        try {
            const saved = await AsyncStorage.getItem(`@tab_data_${tabId}_fin`);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.category) setCategory(data.category);
                if (data.emi) setEmiConfig(data.emi);
                if (data.stock) setStockConfig(data.stock);
                if (data.legacy) setLegacyConfig(data.legacy);
                if (data.reg) setRegConfig(data.reg);
                if (data.sip) setSipConfig(data.sip);
                if (data.gst) setGstConfig(data.gst);
                if (data.intType) setIntType(data.intType);
                if (data.is30Day !== undefined) setIs30DayMode(data.is30Day);
                if (data.gstInc !== undefined) setIsGstInclusive(data.gstInc);
            }
        } catch (e) {} finally { setDataLoaded(true); }
    };
    loadData();
  }, [tabId]);

  // --- AUTO SAVE ---
  useEffect(() => {
    if (!dataLoaded) return;
    const timer = setTimeout(() => {
        const fullState = {
            category,
            emi: emiConfig,
            stock: stockConfig,
            legacy: legacyConfig,
            reg: regConfig,
            sip: sipConfig,
            gst: gstConfig,
            intType,
            is30Day: is30DayMode,
            gstInc: isGstInclusive
        };
        AsyncStorage.setItem(`@tab_data_${tabId}_fin`, JSON.stringify(fullState)).catch(()=>{});
    }, 800);
    return () => clearTimeout(timer);
  }, [category, emiConfig, stockConfig, legacyConfig, regConfig, sipConfig, gstConfig, intType, is30DayMode, isGstInclusive, tabId, dataLoaded]);

  useEffect(() => {
  if (!dataLoaded) return;

  switch (category) {
    case "EMI": calculateEMI(); break;
    case "Interest":
      intType === "Regular"
        ? calculateRegularInterest()
        : calculateInterestLegacy();
      break;
    case "Stocks": calculateStockAvg(); break;
    case "SIP": calculateSIP(); break;
    case "GST": calculateGST(); break;
  }
}, [dataLoaded]);

  // --- REPORT USAGE ---
  useEffect(() => {
    // Check if ANY field in ANY category has data
    const isEmiUsed = emiConfig.amount || emiConfig.rate || emiConfig.tenure;
    const isStockUsed = stockConfig.q1 || stockConfig.q2;
    const isLegacyUsed = legacyConfig.principal || legacyConfig.rate || legacyConfig.time;
    const isRegUsed = regConfig.principal || (regConfig.rate !== "2"); // Check simple diff from default
    const isSipUsed = sipConfig.investment || sipConfig.rate || sipConfig.years;
    const isGstUsed = gstConfig.amount;
    
    const isUsed = isEmiUsed || isStockUsed || isLegacyUsed || isRegUsed || isSipUsed || isGstUsed;
    
    if (reportUsage) reportUsage(tabId, 'finance', !!isUsed);
  }, [emiConfig, stockConfig, legacyConfig, regConfig, sipConfig, gstConfig, reportUsage, tabId]);

  // --- LOAD LOGIC ---
  const loadFromExpression = (expr) => {
    if (!expr) return;
    if (expr.startsWith("EMI:")) {
       setCategory("EMI");
       const parts = expr.replace("EMI: ", "").split(" @ ");
       if (parts.length < 2) return;
       const p = parts[0];
       const rest = parts[1].split("% for ");
       if (rest.length < 2) return;
       const r = rest[0];
       const n = rest[1].replace("y", "").replace("m", "");
       const unit = rest[1].includes("m") ? "Months" : "Years";
       const newConfig = { amount: p, rate: r, tenure: n, tenureUnit: unit };
       setEmiConfig(newConfig);
       calculateEMI(newConfig);
    } 
    else if (expr.includes("Stock Avg:")) {
       setCategory("Stocks");
       const clean = expr.replace("Stock Avg: ", "");
       const parts = clean.split(" + ");
       if(parts.length < 2) return;
       const left = parts[0].split("x");
       const right = parts[1].split("x");
       if(left.length === 2 && right.length === 2) {
         const newConfig = { q1: left[0], p1: left[1], q2: right[0], p2: right[1] };
         setStockConfig(newConfig);
         calculateStockAvg(newConfig);
       }
    }
    else if (expr.includes("Reg Int:")) {
        setCategory("Interest");
        setIntType("Regular");
        const clean = expr.replace("Reg Int: ", "");
        const parts = clean.split(" @ ");
        if (parts.length < 2) return;
        const newConf = { ...regConfig, principal: parts[0] };
        const rest = parts[1].split("% ");
        if (rest.length < 2) return;
        newConf.rate = rest[0];
        
        const unitAndDates = rest[1].split(" | ");
        if (unitAndDates.length >= 1) {
             const u = unitAndDates[0].trim();
             if (['Yearly','Monthly','Weekly','Daily'].includes(u)) newConf.rateUnit = u;
        }
        if (unitAndDates.length >= 2) {
            const dates = unitAndDates[1].split(" to ");
            if (dates.length >= 2) {
                newConf.start = dates[0];
                newConf.end = dates[1];
            }
        }
        let loadedMode = true; 
        if (unitAndDates.length >= 3) {
            if (unitAndDates[2].trim() === "Cal") loadedMode = false;
        }
        setIs30DayMode(loadedMode);
        newConf.mode = loadedMode;
        setRegConfig(newConf);
        calculateRegularInterest(newConf);
    }
    else if (expr.includes("Simple Int:") || expr.includes("Compound Int:")) {
        setCategory("Interest");
        const type = expr.includes("Simple") ? "Simple" : "Compound";
        setIntType(type);
        const clean = expr.replace(`${type} Int: `, "");
        const parts = clean.split(" @ ");
        if (parts.length < 2) return;
        const p = parts[0];
        const rest = parts[1].split("% for ");
        if (rest.length < 2) return;
        const r = rest[0];
        const t = rest[1].replace("y", "");
        const newConfig = { principal: p, rate: r, time: t, cmpVal: "", cmpUnit: "Yearly" };
        setLegacyConfig(newConfig);
        calculateInterestLegacy(newConfig, type);
    }
    else if (expr.startsWith("SIP:")) {
        setCategory("SIP");
        const clean = expr.replace("SIP: ", "");
        const parts = clean.split(" @ "); 
        if (parts.length < 2) return;
        const inv = parts[0];
        const rest = parts[1].split("% for ");
        if (rest.length < 2) return;
        const r = rest[0];
        const y = rest[1].replace("y", "");
        const newConfig = { investment: inv, rate: r, years: y };
        setSipConfig(newConfig);
        calculateSIP(newConfig);
    }
    else if (expr.startsWith("GST:")) {
        setCategory("GST");
        const clean = expr.replace("GST: ", "");
        const parts = clean.split(" @ "); 
        if (parts.length < 2) return;
        const amt = parts[0];
        const rest = parts[1].split("% (");
        if (rest.length < 2) return;
        const r = rest[0];
        const typeStr = rest[1].replace(")", ""); 
        const newConfig = { amount: amt, rate: r };
        setGstConfig(newConfig);
        setIsGstInclusive(typeStr === "Inclusive");
        calculateGST(newConfig, typeStr === "Inclusive");
    }
  };

useEffect(() => { if (pendingLoad?.targetTabId === tabId) { if (pendingLoad.category) setCategory(pendingLoad.category); loadFromExpression(pendingLoad.expression); onConsumeLoad(); } }, [pendingLoad, tabId]);

  const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const cleanStr = dateStr.replace(/\//g, '-');
      const parts = cleanStr.split('-');
      if (parts.length !== 3) return null;
      const d = parts[0].trim().padStart(2, '0');
      const m = parts[1].trim().padStart(2, '0');
      const y = parts[2].trim();
      return new Date(`${y}-${m}-${d}`);
  };

  const getDurationBreakdown = (d1, d2) => {
      if (d1 > d2) [d1, d2] = [d2, d1];
      let years = d2.getFullYear() - d1.getFullYear();
      let months = d2.getMonth() - d1.getMonth();
      let days = d2.getDate() - d1.getDate();
      if (days < 0) {
          months--;
          const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
          days += prevMonth.getDate();
      }
      if (months < 0) { years--; months += 12; }
      return { years, months, days };
  };

  const isToday = (dateObj) => {
      const t = new Date();
      return dateObj.getDate() === t.getDate() &&
             dateObj.getMonth() === t.getMonth() &&
             dateObj.getFullYear() === t.getFullYear();
  };

  const calculateEMI = (overrideConfig) => {
    const data = overrideConfig || emiConfig;
    const { amount, rate, tenure, tenureUnit } = data;
    if (!amount || !rate || !tenure) return;
    const P = parseFloat(amount);
    const R = parseFloat(rate) / 12 / 100; 
    let N = parseFloat(tenure);
    if (tenureUnit === "Years") { N = N * 12; }

    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;
    const res = {
      emi: emi.toFixed(2),
      total: totalPayment.toFixed(2),
      interest: totalInterest.toFixed(2),
      principal: P,
      principalPct: totalPayment > 0 ? P / totalPayment : 0,
      interestPct: totalPayment > 0 ? totalInterest / totalPayment : 0
    };
    setEmiResult(res);
    Keyboard.dismiss();
    if (!overrideConfig && onSave) {
        const unitChar = tenureUnit === "Years" ? "y" : "m";
        onSave(`EMI: ${P} @ ${rate}% for ${tenure}${unitChar}`, `EMI: ${res.emi}, Total: ${res.total}`, "finance", "EMI");
    }
  };

  const calculateRegularInterest = (overrideConfig) => {
      const data = overrideConfig || regConfig;
      const { principal, rate, rateUnit, start, end, nthVal, nthUnit } = data;
      if (!principal || !rate || !start || !end) return;
      
      const calcMode30 = (overrideConfig && overrideConfig.mode !== undefined) ? overrideConfig.mode : is30DayMode;

      const P = parseFloat(principal);
      let rawRate = parseFloat(rate);
      
      const d1 = parseDate(start);
      const d2 = parseDate(end);
      if (!d1 || !d2 || isNaN(d1) || isNaN(d2)) {
          if (!overrideConfig) alert("Invalid Date Format (e.g. 1-1-2025)");
          return;
      }
      
      let T_years = 0;
      let diffDays = 0;
      let R_annual = rawRate;
      let breakdown = { years:0, months:0, days:0 };

      if (calcMode30) {
          if (rateUnit === "Monthly") R_annual = rawRate * 12;
          else if (rateUnit === "Weekly") R_annual = rawRate * 52;
          else if (rateUnit === "Daily") R_annual = rawRate * 360;

          let yearDiff = d2.getFullYear() - d1.getFullYear();
          let monthDiff = d2.getMonth() - d1.getMonth();
          let dayDiff = d2.getDate() - d1.getDate();
          if (dayDiff < 0) { monthDiff -= 1; dayDiff += 30; }
          if (monthDiff < 0) { yearDiff -= 1; monthDiff += 12; }
          
          diffDays = (yearDiff * 360) + (monthDiff * 30) + dayDiff;
          T_years = diffDays / 360.0;
          breakdown = { years: yearDiff, months: monthDiff, days: dayDiff };
      } else {
          if (rateUnit === "Monthly") R_annual = rawRate * 12;
          else if (rateUnit === "Weekly") R_annual = rawRate * 52;
          else if (rateUnit === "Daily") R_annual = rawRate * 365;

          const diffTime = Math.abs(d2 - d1);
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          T_years = diffDays / 365.0;
          breakdown = getDurationBreakdown(d1, d2);
      }

      const displayMonthlyRate = parseFloat((R_annual / 12).toFixed(2));
      const isEndToday = isToday(d2);

      const getCompounded = (freqYears) => {
          if (freqYears <= 0) return P; 
          const ratePerPeriod = (R_annual * freqYears) / 100; 
          const numPeriods = T_years / freqYears;
          return P * Math.pow(1 + ratePerPeriod, numPeriods);
      };

      const simpleTotal = P + (P * R_annual * T_years) / 100;
      const yr3Total = T_years >= 3 ? getCompounded(3) : null;
      const yr2Total = T_years >= 2 ? getCompounded(2) : null;
      const yr1Total = T_years >= 1 ? getCompounded(1) : null;
      let nthTotal = null;
      let nthLabel = "";
      
      if (nthVal) {
          const val = parseFloat(nthVal);
          let freqInYears = 0;
          if (calcMode30) {
              if (nthUnit === "Years") freqInYears = val;
              else if (nthUnit === "Months") freqInYears = val * (30/360);
              else if (nthUnit === "Weeks") freqInYears = (val * 7) / 360;
              else if (nthUnit === "Days") freqInYears = val / 360;
          } else {
              if (nthUnit === "Years") freqInYears = val;
              else if (nthUnit === "Months") freqInYears = val / 12;
              else if (nthUnit === "Weeks") freqInYears = val / 52;
              else if (nthUnit === "Days") freqInYears = val / 365;
          }
          if (freqInYears > 0 && T_years >= freqInYears) {
              nthTotal = getCompounded(freqInYears);
              nthLabel = `${val} ${nthUnit}`;
          }
      }

      const format = (amt) => ({ interest: (amt - P).toFixed(2), total: amt.toFixed(2) });

      setRegResult({
          diffDays, breakdown, startStr: toFriendlyDate(d1), endStr: toFriendlyDate(d2),
          isEndToday, monthlyRate: displayMonthlyRate,
          simple: format(simpleTotal),
          yr3: yr3Total ? format(yr3Total) : null,
          yr2: yr2Total ? format(yr2Total) : null,
          yr1: yr1Total ? format(yr1Total) : null,
          nth: nthTotal ? format(nthTotal) : null,
          nthLabel, modeUsed: calcMode30 ? "30/360" : "Actual/365"
      });
      Keyboard.dismiss();
      if (!overrideConfig && onSave) {
          const modeTag = calcMode30 ? "30" : "Cal";
          onSave(`Reg Int: ${P} @ ${rawRate}% ${rateUnit} | ${start} to ${end} | ${modeTag}`, `Days: ${diffDays}, Simp: ${format(simpleTotal).total}`, "finance", "Interest");
      }
  };

  const calculateStockAvg = (overrideConfig) => {
    const data = overrideConfig || stockConfig;
    const { q1, p1, q2, p2 } = data;
    if (!q1 || !p1 || !q2 || !p2) return;
    const qty1 = parseFloat(q1); const price1 = parseFloat(p1);
    const qty2 = parseFloat(q2); const price2 = parseFloat(p2);
    const oldAmt = qty1 * price1;
    const newAmt = qty2 * price2;
    const totalQty = qty1 + qty2;
    const totalAmt = oldAmt + newAmt;
    const avgPrice = totalAmt / totalQty;
    const res = { 
        totalQty, totalAmt: totalAmt.toFixed(2), avg: avgPrice.toFixed(2),
        oldQty: qty1, oldPrice: price1, oldTotal: oldAmt.toFixed(2),
        newQty: qty2, newPrice: price2, newTotal: newAmt.toFixed(2)
    };
    setStockResult(res);
    Keyboard.dismiss();
    if (!overrideConfig && onSave) {
        onSave(`Stock Avg: ${q1}x${p1} + ${q2}x${p2}`, `Avg: ${res.avg}, Qty: ${totalQty}`, "finance", "Stocks");
    }
  };

  const calculateInterestLegacy = (overrideConfig, overrideType) => {
      const data = overrideConfig || legacyConfig;
      const type = overrideType || intType;
      const { principal, rate, time, cmpVal, cmpUnit = "Yearly" } = data;
      
      if (!principal || !rate || !time) return;
      const P = parseFloat(principal);
      const R = parseFloat(rate);
      const T = parseFloat(time);
      let interest = 0;
      let total = 0;

      if (type === "Simple") { 
          interest = (P * R * T) / 100; 
          total = P + interest; 
      } else { 
          let n = 1;
          const val = parseFloat(cmpVal) || 1; 
          if (cmpUnit === "Yearly") n = 1 / val;
          else if (cmpUnit === "Monthly") n = 12 / val;
          else if (cmpUnit === "Weekly") n = 52 / val;
          else if (cmpUnit === "Daily") n = 365 / val;
          const r = R / 100;
          total = P * Math.pow(1 + (r / n), n * T);
          interest = total - P; 
      }
      setIntResult({ interest: interest.toFixed(2), total: total.toFixed(2) });
      Keyboard.dismiss();
      if (!overrideConfig && onSave) {
          onSave(`${type} Int: ${P} @ ${R}% for ${T}y`, `Int: ${interest.toFixed(2)}, Total: ${total.toFixed(2)}`, "finance", "Interest");
      }
  }

  const calculateSIP = (overrideConfig) => {
      const data = overrideConfig || sipConfig;
      const { investment, rate, years } = data;
      if (!investment || !rate || !years) return;
      const P = parseFloat(investment);
      const n = parseFloat(years) * 12;
      const i = parseFloat(rate) / 100 / 12;
      const investedAmount = P * n;
      const totalValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
      const estReturns = totalValue - investedAmount;

      const res = {
          invested: investedAmount.toFixed(0),
          returns: estReturns.toFixed(0),
          total: totalValue.toFixed(0),
          returnPct: totalValue > 0 ? estReturns / totalValue : 0
      };
      setSipResult(res);
      Keyboard.dismiss();

      if (!overrideConfig && onSave) {
          onSave(`SIP: ${P} @ ${rate}% for ${years}y`, `Total: ${res.total}, Ret: ${res.returns}`, "finance", "SIP");
      }
  };

  const calculateGST = (overrideConfig, overrideInclusive) => {
      const data = overrideConfig || gstConfig;
      const inclusive = (overrideInclusive !== undefined) ? overrideInclusive : isGstInclusive;
      
      const { amount, rate } = data;
      if (!amount || !rate) return;
      const basePrice = parseFloat(amount);
      const gstRate = parseFloat(rate);
      let gstAmount = 0;
      let netAmount = 0;
      let totalAmount = 0;

      if (inclusive) {
          netAmount = basePrice / (1 + (gstRate / 100));
          gstAmount = basePrice - netAmount;
          totalAmount = basePrice;
      } else {
          gstAmount = (basePrice * gstRate) / 100;
          netAmount = basePrice;
          totalAmount = basePrice + gstAmount;
      }
      setGstResult({ net: netAmount.toFixed(2), gst: gstAmount.toFixed(2), total: totalAmount.toFixed(2) });
      Keyboard.dismiss();

      if (!overrideConfig && onSave) {
          const typeStr = inclusive ? "Inclusive" : "Exclusive";
          onSave(`GST: ${amount} @ ${rate}% (${typeStr})`, `Total: ${totalAmount.toFixed(2)}, GST: ${gstAmount.toFixed(2)}`, "finance", "GST");
      }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    catWrap: { maxHeight: 90 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'center' },
    catBtn: { margin: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: colors.subTab },
    catBtnActive: { backgroundColor: colors.accent },
    catText: { fontWeight: '600', color: colors.secTxt },
    catTextActive: { color: 'white' },
    section: { padding: 20 },
    label: { color: colors.secTxt, fontSize: 14, marginTop: 15, marginBottom: 5 },
    input: { backgroundColor: colors.btn, color: colors.txt, padding: 15, borderRadius: 10, fontSize: 18, borderWidth: 1, borderColor: '#333' },
    row: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    calcBtn: { backgroundColor: colors.accent, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 20 },
    calcBtnTxt: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    resBox: { marginTop: 20, padding: 20, backgroundColor: colors.btn, borderRadius: 15, alignItems: 'stretch' },
    resBig: { fontSize: 32, fontWeight: 'bold', color: colors.txt },
    resLabel: { color: colors.secTxt, fontSize: 14 },
    resRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.subTab, paddingTop: 10 },
    resTxt: { color: colors.txt, fontWeight: 'bold' },
    headerLine: { color: colors.secTxt, fontSize: 14, marginBottom: 6 },
    highlight: { color: colors.accent, fontWeight: 'bold' }, 
    divider: { height: 1, backgroundColor: colors.subTab, marginVertical: 10 },
    resultBlock: { marginBottom: 15 },
    blockTitle: { color: colors.accent, fontWeight: 'bold', fontSize: 16, marginBottom: 8, textTransform: 'capitalize' },
    blockRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    blockLabel: { color: colors.secTxt, fontSize: 14 },
    blockVal: { color: colors.txt, fontWeight: 'bold', fontSize: 14 },
    toggleContainer: { flexDirection: 'row', backgroundColor: colors.btn, borderRadius: 10, borderWidth:1, borderColor:'#333', overflow:'hidden', marginTop: 0 },
    toggleBtn: { flex: 1, paddingVertical: 15, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.accent },
    toggleTxt: { fontSize: 12, fontWeight: 'bold' }
  });

 if (showHistory) { return ( <HistoryList history={globalHistory} colors={colors} formatNumber={formatNumber} onRemoveItem={onRemoveItem} onClear={onClear} onSelect={onRequestNewTab} /> ); }

  const ResultRow = ({ label, value, color }) => (
    <View style={s.blockRow}>
      <Text style={s.blockLabel}>{label}</Text>
      <Text style={[s.blockVal, color && { color }]}>{formatNumber(value, 2)}</Text>
    </View>
  );

  return (
    <View style={s.container}>
        <View style={s.catWrap}>
            <ScrollView contentContainerStyle={s.catGrid}>
            {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[s.catBtn, category === cat && s.catBtnActive]} 
                    onPress={() => { 
                        setCategory(cat); 
                        setEmiResult(null); setStockResult(null); setIntResult(null); setRegResult(null); setSipResult(null); setGstResult(null);
                    }}>
                <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
            ))}
            </ScrollView>
        </View>

        <ScrollView contentContainerStyle={s.section}>
            {category === "EMI" && (
                <View>
                    <Text style={s.label}>Loan Amount</Text>
                    <TextInput style={s.input} value={emiConfig.amount} onChangeText={t => setEmiConfig({...emiConfig, amount: t})} keyboardType="numeric" placeholder="e.g. 500000" placeholderTextColor={colors.secTxt} />
                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Interest % (Yearly)</Text>
                            <TextInput style={s.input} value={emiConfig.rate} onChangeText={t => setEmiConfig({...emiConfig, rate: t})} keyboardType="numeric" placeholder="e.g. 8.5" placeholderTextColor={colors.secTxt} />
                        </View>
                    </View>
                    <Text style={s.label}>Tenure</Text>
                    <View style={s.row}>
                        <View style={s.col}>
                            <TextInput style={s.input} value={emiConfig.tenure} onChangeText={t => setEmiConfig({...emiConfig, tenure: t})} keyboardType="numeric" placeholder="e.g. 5" placeholderTextColor={colors.secTxt} />
                        </View>
                        <View style={s.col}>
                            <View style={s.toggleContainer}>
                                {['Years', 'Months'].map(u => (
                                    <TouchableOpacity key={u} onPress={()=>setEmiConfig({...emiConfig, tenureUnit: u})} 
                                      style={[s.toggleBtn, emiConfig.tenureUnit===u && s.toggleBtnActive]}>
                                        <Text style={[s.toggleTxt, {color: emiConfig.tenureUnit===u ? 'white' : colors.secTxt}]}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity style={s.calcBtn} onPress={() => calculateEMI()}>
                        <Text style={s.calcBtnTxt}>Calculate</Text>
                    </TouchableOpacity>
                    {emiResult && (
                        <View style={s.resBox}>
                            <Text style={[s.resLabel, {textAlign:'center', marginBottom:5}]}>Monthly EMI</Text>
                            <Text style={[s.resBig, {textAlign:'center', marginBottom: 20}]}>{formatNumber(emiResult.emi, 2)}</Text>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <PieChart2Segment 
                                    radius={80}
                                    percent={emiResult.interestPct} 
                                    colorFilled="#EF4444" 
                                    colorEmpty="#4F46E5" 
                                    totalValue={emiResult.total}
                                    formatFn={formatNumber}
                                />
                                <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#4F46E5', marginRight: 6}}/>
                                        <Text style={{color: colors.secTxt, fontSize: 12}}>Principal</Text>
                                    </View>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginRight: 6}}/>
                                        <Text style={{color: colors.secTxt, fontSize: 12}}>Interest</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ borderTopWidth: 1, borderTopColor: colors.subTab, paddingTop: 15 }}>
                                <ResultRow label="EMI (Per month):" value={emiResult.emi} />
                                <ResultRow label="Total Principal:" value={emiResult.principal} />
                                <ResultRow label="Total Interest:" value={emiResult.interest} color="#EF4444" />
                                <ResultRow label="Total Amount:" value={emiResult.total} />
                            </View>
                        </View>
                    )}
                </View>
            )}
            {category === "Interest" && (
                 <View>
                     <View style={{flexDirection:'row', marginBottom: 10, backgroundColor: colors.subTab, borderRadius: 10, padding: 5}}>
                         {["Regular", "Simple", "Compound"].map(t => (
                             <TouchableOpacity key={t} style={{flex:1, padding:10, alignItems:'center', backgroundColor: intType===t ? colors.btn : 'transparent', borderRadius: 8}} onPress={()=>setIntType(t)}>
                                 <Text style={{color: intType===t ? colors.accent : colors.secTxt, fontWeight:'bold'}}>{t}</Text>
                             </TouchableOpacity>
                         ))}
                     </View>
                    {intType === "Regular" ? (
                        <View>
                             <Text style={s.label}>Taken Amount</Text>
                             <TextInput style={s.input} value={regConfig.principal} onChangeText={t => setRegConfig({...regConfig, principal: t})} keyboardType="numeric" placeholder="Principal" placeholderTextColor={colors.secTxt} />
                             <Text style={s.label}>Interest Rate</Text>
                             <View style={s.row}>
                                 <View style={s.col}>
                                     <TextInput style={s.input} value={regConfig.rate} onChangeText={t => setRegConfig({...regConfig, rate: t})} keyboardType="numeric" placeholder="Rate" placeholderTextColor={colors.secTxt} />
                                 </View>
                                 <View style={s.col}>
                                      <View style={s.toggleContainer}>
                                          {['Y', 'M', 'W', 'D'].map(u => {
                                              const full = {'Y':'Yearly','M':'Monthly','W':'Weekly','D':'Daily'}[u];
                                              return (
                                              <TouchableOpacity key={u} onPress={()=>setRegConfig({...regConfig, rateUnit: full})} 
                                                style={[s.toggleBtn, regConfig.rateUnit===full && s.toggleBtnActive]}>
                                                  <Text style={[s.toggleTxt, {color: regConfig.rateUnit===full ? 'white' : colors.secTxt}]}>{u}</Text>
                                              </TouchableOpacity>
                                          )})}
                                      </View>
                                 </View>
                             </View>
                             <View style={s.row}>
                                <View style={s.col}>
                                    <Text style={s.label}>From (DD-MM-YYYY)</Text>
                                    <TextInput style={s.input} value={regConfig.start} onChangeText={t => setRegConfig({...regConfig, start: t})} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} keyboardType="numeric" />
                                </View>
                                <View style={s.col}>
                                    <Text style={s.label}>To (DD-MM-YYYY)</Text>
                                    <TextInput style={s.input} value={regConfig.end} onChangeText={t => setRegConfig({...regConfig, end: t})} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} keyboardType="numeric" />
                                </View>
                             </View>

                             <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:15, marginBottom:5}}>
                                <Text style={s.label}>Calculation Mode:</Text>
                                <View style={{flexDirection:'row', backgroundColor: colors.btn, borderRadius:20, padding:2, borderWidth:1, borderColor:'#333'}}>
                                    <TouchableOpacity onPress={()=>setIs30DayMode(true)} style={{paddingHorizontal:12, paddingVertical:6, borderRadius:18, backgroundColor: is30DayMode ? colors.accent : 'transparent'}}>
                                        <Text style={{fontSize:12, fontWeight:'bold', color: is30DayMode ? '#fff' : colors.secTxt}}>30 Days/M</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={()=>setIs30DayMode(false)} style={{paddingHorizontal:12, paddingVertical:6, borderRadius:18, backgroundColor: !is30DayMode ? colors.accent : 'transparent'}}>
                                        <Text style={{fontSize:12, fontWeight:'bold', color: !is30DayMode ? '#fff' : colors.secTxt}}>Calendar days</Text>
                                    </TouchableOpacity>
                                </View>
                             </View>

                             <Text style={s.label}>Nth Compound ({regConfig.nthUnit}) (Optional)</Text>
                             <View style={s.row}>
                                 <View style={s.col}>
                                     <TextInput style={s.input} value={regConfig.nthVal} onChangeText={t => setRegConfig({...regConfig, nthVal: t})} keyboardType="numeric" placeholder="Value (e.g. 6)" placeholderTextColor={colors.secTxt} />
                                 </View>
                                 <View style={s.col}>
                                      <View style={s.toggleContainer}>
                                          {['Y', 'M', 'W', 'D'].map(u => {
                                               const full = {'Y':'Years','M':'Months','W':'Weeks','D':'Days'}[u];
                                               return (
                                              <TouchableOpacity key={u} onPress={()=>setRegConfig({...regConfig, nthUnit: full})} 
                                                style={[s.toggleBtn, regConfig.nthUnit===full && s.toggleBtnActive]}>
                                                  <Text style={[s.toggleTxt, {color: regConfig.nthUnit===full ? 'white' : colors.secTxt}]}>{u}</Text>
                                              </TouchableOpacity>
                                          )})}
                                      </View>
                                 </View>
                             </View>
                             <TouchableOpacity style={s.calcBtn} onPress={() => calculateRegularInterest()}>
                                <Text style={s.calcBtnTxt}>Calculate</Text>
                            </TouchableOpacity>
                            {regResult && (
                                <View style={s.resBox}>
                                    <Text style={s.headerLine}>
                                        Monthly Interest Rate: <Text style={s.highlight}>{regResult.monthlyRate}%</Text>
                                    </Text>
                                    <Text style={s.headerLine}>Calculation Mode: <Text style={s.highlight}>{regResult.modeUsed}</Text></Text>
                                    <Text style={s.headerLine}>
                                         From <Text style={s.highlight}>{regResult.startStr}</Text> to <Text style={s.highlight}>{regResult.endStr}</Text>
                                         {regResult.isEndToday ? " (today)" : ""}
                                    </Text>
                                    <Text style={[s.headerLine, s.highlight]}>
                                      Total Duration :{`  ${regResult.breakdown.years}y ${regResult.breakdown.months}m ${regResult.breakdown.days}d`}
                                    </Text>
                                    <Text style={s.headerLine}> Total Duration in Days : {regResult.diffDays}</Text>
                                    <View style={{height: 1, backgroundColor: colors.secTxt, marginVertical: 10}} />
                                    {[
                                      { title: "without compound (simple)", data: regResult.simple },
                                      regResult.yr3 ? { title: "3Yearsly compound", data: regResult.yr3 } : null,
                                      regResult.yr2 ? { title: "2Yearsly compound", data: regResult.yr2 } : null,
                                      regResult.yr1 ? { title: "Yearly compound", data: regResult.yr1 } : null,
                                      regResult.nth ? { title: `Every ${regResult.nthLabel} Compound`, data: regResult.nth } : null
                                    ].map((block, idx) => block && (
                                        <View key={idx}>
                                            <View style={s.resultBlock}>
                                                <Text style={s.blockTitle}>{block.title}:</Text>
                                                <ResultRow label="Taken Amount:" value={regConfig.principal} />
                                                <ResultRow label="interest:" value={block.data.interest} color={colors.accent} />
                                                <ResultRow label="Total:" value={block.data.total} />
                                            </View>
                                            {idx !== 4 && <View style={{height: 1, backgroundColor: colors.subTab, marginVertical: 10}} />}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View>
                            <Text style={s.label}>Principal Amount</Text>
                            <TextInput style={s.input} value={legacyConfig.principal} onChangeText={t => setLegacyConfig({...legacyConfig, principal: t})} keyboardType="numeric" />
                            <View style={s.row}>
                                <View style={s.col}>
                                    <Text style={s.label}>Rate (%)</Text>
                                    <TextInput style={s.input} value={legacyConfig.rate} onChangeText={t => setLegacyConfig({...legacyConfig, rate: t})} keyboardType="numeric" />
                                </View>
                                <View style={s.col}>
                                    <Text style={s.label}>Time (Years)</Text>
                                    <TextInput style={s.input} value={legacyConfig.time} onChangeText={t => setLegacyConfig({...legacyConfig, time: t})} keyboardType="numeric" />
                                </View>
                            </View>
                            {intType === "Compound" && (
                                <View>
                                    <Text style={s.label}>Compound Every</Text>
                                    <View style={s.row}>
                                        <View style={{ flex: 0.8 }}>
                                            <TextInput 
                                                style={s.input} 
                                                value={legacyConfig.cmpVal} 
                                                onChangeText={t => setLegacyConfig({...legacyConfig, cmpVal: t})} 
                                                keyboardType="numeric" 
                                                placeholder="1"
                                                placeholderTextColor={colors.secTxt}
                                            />
                                        </View>
                                        <View style={{ flex: 2.2 }}>
                                            <View style={s.toggleContainer}>
                                                {['Yearly', 'Monthly', 'Weekly', 'Daily'].map(u => (
                                                    <TouchableOpacity key={u} onPress={()=>setLegacyConfig({...legacyConfig, cmpUnit: u})} 
                                                      style={[s.toggleBtn, legacyConfig.cmpUnit===u && s.toggleBtnActive, {paddingHorizontal: 2}]}>
                                                        <Text style={[s.toggleTxt, {color: legacyConfig.cmpUnit===u ? 'white' : colors.secTxt, fontSize: 10}]}>{u}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                            <TouchableOpacity style={s.calcBtn} onPress={() => calculateInterestLegacy()}>
                                <Text style={s.calcBtnTxt}>Calculate</Text>
                            </TouchableOpacity>
                            {intResult && (
                                <View style={[s.resBox, {alignItems: 'center'}]}>
                                    <Text style={s.resLabel}>Total Returns</Text>
                                    <Text style={s.resBig}>{formatNumber(intResult.total, 2)}</Text>
                                    <View style={s.resRow}>
                                        <Text style={{color: colors.secTxt}}>Principal</Text>
                                        <Text style={s.resTxt}>{formatNumber(legacyConfig.principal, 2)}</Text>
                                    </View>
                                    <View style={s.resRow}>
                                        <Text style={{color: colors.secTxt}}>Interest Earned</Text>
                                        <Text style={[s.resTxt, {color: colors.accent}]}>+ {formatNumber(intResult.interest, 2)}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                 </View>
            )}
            {category === "Stocks" && (
                <View>
                    <Text style={{color: colors.secTxt, marginBottom: 15}}>Calculate average price of existing holdings + new purchase.</Text>
                    <Text style={{color: colors.accent, fontWeight:'bold', marginBottom: 5}}>1. Existing Holding (Already Bought)</Text>
                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Quantity</Text>
                            <TextInput style={s.input} value={stockConfig.q1} onChangeText={t => setStockConfig({...stockConfig, q1: t})} keyboardType="numeric" />
                        </View>
                        <View style={s.col}>
                            <Text style={s.label}>Buy Price</Text>
                            <TextInput style={s.input} value={stockConfig.p1} onChangeText={t => setStockConfig({...stockConfig, p1: t})} keyboardType="numeric" />
                        </View>
                    </View>
                    <Text style={{color: colors.accent, fontWeight:'bold', marginTop: 20, marginBottom: 5}}>2. New Purchase (Will Buy)</Text>
                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Quantity</Text>
                            <TextInput style={s.input} value={stockConfig.q2} onChangeText={t => setStockConfig({...stockConfig, q2: t})} keyboardType="numeric" />
                        </View>
                        <View style={s.col}>
                            <Text style={s.label}>Buy Price</Text>
                            <TextInput style={s.input} value={stockConfig.p2} onChangeText={t => setStockConfig({...stockConfig, p2: t})} keyboardType="numeric" />
                        </View>
                    </View>
                    <TouchableOpacity style={s.calcBtn} onPress={() => calculateStockAvg()}>
                        <Text style={s.calcBtnTxt}>Calculate</Text>
                    </TouchableOpacity>
                    {stockResult && (
                        <View style={[s.resBox, {alignItems: 'center'}]}>
                            <Text style={s.resLabel}>New Average Price</Text>
                            <Text style={s.resBig}>{formatNumber(stockResult.avg, 2)}</Text>
                            <View style={s.resRow}>
                                <Text style={{color: colors.secTxt}}>Old Inv ({stockResult.oldQty} @ {formatNumber(stockResult.oldPrice, 2)})</Text>
                                <Text style={s.resTxt}>{formatNumber(stockResult.oldTotal, 2)}</Text>
                            </View>
                            <View style={s.resRow}>
                                <Text style={{color: colors.secTxt}}>New Inv ({stockResult.newQty} @ {formatNumber(stockResult.newPrice, 2)})</Text>
                                <Text style={s.resTxt}>{formatNumber(stockResult.newTotal, 2)}</Text>
                            </View>
                            <View style={s.resRow}>
                                <Text style={{color: colors.secTxt}}>Total Quantity</Text>
                                <Text style={s.resTxt}>{stockResult.totalQty}</Text>
                            </View>
                            <View style={s.resRow}>
                                <Text style={{color: colors.secTxt}}>Total Investment</Text>
                                <Text style={s.resTxt}>{formatNumber(stockResult.totalAmt, 2)}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
            {category === "SIP" && (
                <View>
                    <Text style={s.label}>Monthly Investment</Text>
                    <TextInput style={s.input} value={sipConfig.investment} onChangeText={t => setSipConfig({...sipConfig, investment: t})} keyboardType="numeric" placeholder="e.g. 5000" placeholderTextColor={colors.secTxt} />
                    <View style={s.row}>
                        <View style={s.col}>
                            <Text style={s.label}>Exp. Return %</Text>
                            <TextInput style={s.input} value={sipConfig.rate} onChangeText={t => setSipConfig({...sipConfig, rate: t})} keyboardType="numeric" placeholder="e.g. 12" placeholderTextColor={colors.secTxt} />
                        </View>
                        <View style={s.col}>
                            <Text style={s.label}>Period (Years)</Text>
                            <TextInput style={s.input} value={sipConfig.years} onChangeText={t => setSipConfig({...sipConfig, years: t})} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor={colors.secTxt} />
                        </View>
                    </View>
                    <TouchableOpacity style={s.calcBtn} onPress={() => calculateSIP()}>
                        <Text style={s.calcBtnTxt}>Calculate</Text>
                    </TouchableOpacity>
                    {sipResult && (
                        <View style={s.resBox}>
                            <Text style={[s.resLabel, {textAlign:'center'}]}>Expected Maturity Value</Text>
                            <Text style={[s.resBig, {textAlign:'center', marginBottom: 20}]}>{formatNumber(sipResult.total, 2)}</Text>
                            
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <PieChart2Segment 
                                    radius={80}
                                    percent={sipResult.returnPct} 
                                    colorFilled="#10B981" 
                                    colorEmpty="#4F46E5" 
                                    totalValue={sipResult.total}
                                    formatFn={formatNumber}
                                />
                                <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#4F46E5', marginRight: 6}}/>
                                        <Text style={{color: colors.secTxt, fontSize: 12}}>Invested</Text>
                                    </View>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', marginRight: 6}}/>
                                        <Text style={{color: colors.secTxt, fontSize: 12}}>Returns</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ borderTopWidth: 1, borderTopColor: colors.subTab, paddingTop: 15 }}>
                                <ResultRow label="Invested Amount:" value={sipResult.invested} color="#4F46E5" />
                                <ResultRow label="Est. Returns:" value={sipResult.returns} color="#10B981" />
                                <ResultRow label="Total Value:" value={sipResult.total} />
                            </View>
                        </View>
                    )}
                </View>
            )}
            {category === "GST" && (
                <View>
                    <Text style={s.label}>Amount</Text>
                    <TextInput style={s.input} value={gstConfig.amount} onChangeText={t => setGstConfig({...gstConfig, amount: t})} keyboardType="numeric" placeholder="e.g. 1000" placeholderTextColor={colors.secTxt} />
                    <Text style={s.label}>GST Rate (%)</Text>
                    <View style={{flexDirection:'row', flexWrap:'wrap', gap: 10, marginBottom: 15}}>
                        {["5", "12", "18", "28"].map((r) => (
                             <TouchableOpacity key={r} onPress={() => setGstConfig({...gstConfig, rate: r})} 
                               style={{backgroundColor: gstConfig.rate === r ? colors.accent : colors.subTab, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}>
                                 <Text style={{color: gstConfig.rate === r ? 'white' : colors.secTxt, fontWeight:'bold'}}>{r}%</Text>
                             </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={s.input} value={gstConfig.rate} onChangeText={t => setGstConfig({...gstConfig, rate: t})} keyboardType="numeric" placeholder="Custom Rate" placeholderTextColor={colors.secTxt} />
                    <View style={{marginTop: 20, marginBottom: 10}}>
                         <View style={{flexDirection:'row', backgroundColor: colors.btn, borderRadius:10, borderWidth:1, borderColor:'#333', overflow:'hidden'}}>
                            <TouchableOpacity onPress={()=>setIsGstInclusive(false)} style={[s.toggleBtn, !isGstInclusive && s.toggleBtnActive]}>
                                <Text style={[s.toggleTxt, {color: !isGstInclusive ? 'white' : colors.secTxt}]}>Exclusive (Add GST)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={()=>setIsGstInclusive(true)} style={[s.toggleBtn, isGstInclusive && s.toggleBtnActive]}>
                                <Text style={[s.toggleTxt, {color: isGstInclusive ? 'white' : colors.secTxt}]}>Inclusive (Remove GST)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity style={s.calcBtn} onPress={() => calculateGST()}>
                        <Text style={s.calcBtnTxt}>Calculate</Text>
                    </TouchableOpacity>
                    {gstResult && (
                        <View style={[s.resBox, {alignItems: 'center'}]}>
                            <Text style={s.resLabel}>Total Amount</Text>
                            <Text style={s.resBig}>{formatNumber(gstResult.total, 2)}</Text>
                            <View style={[s.resRow, {marginTop: 20}]}>
                                <Text style={{color: colors.secTxt}}>Net Amount</Text>
                                <Text style={s.resTxt}>{formatNumber(gstResult.net, 2)}</Text>
                            </View>
                            <View style={s.resRow}>
                                <Text style={{color: colors.secTxt}}>GST Amount ({gstConfig.rate}%)</Text>
                                <Text style={[s.resTxt, {color: colors.accent}]}>{formatNumber(gstResult.gst, 2)}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
            <View style={{height: 100}} /> 
        </ScrollView>
    </View>
  );
}