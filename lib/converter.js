import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, Keyboard, Animated, Easing } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TIME_ZONES, CURRENCY_NAMES, CATEGORIES, MAJOR_CURRENCIES } from './conv-helper';

const UNITS = {
  Currency: {
    base: "USD",
    units: { "USD": 1 }
  },
  Length: {
    base: "m",
    units: { "Meter (m)": 1, "Kilometer (km)": 1000, "Centimeter (cm)": 0.01, "Millimeter (mm)": 0.001, "Inch (in)": 0.0254, "Foot (ft)": 0.3048, "Yard (yd)": 0.9144, "Mile (mi)": 1609.34, "Furlong": 201.168, "Gajam (Nellore/AP)": 0.9144, "Mura (Cubit)": 0.4572 }
  },
  Area: {
    base: "m2",
    units: { "Sq Meter (m²)": 1, "Sq Kilometer (km²)": 1000000, "Sq Foot (ft²)": 0.092903, "Sq Yard": 0.836127, "Acre": 4046.86, "Hectare": 10000, "Ankanam (Nellore)": 6.689016, "Cent": 40.4686, "Kuncham (Land)": 404.6856, "Guntha": 101.17, "Gorru (AP)": 12646.4, "Ground": 222.967, "Bigha (Pucca)": 2529.28 }
  },
  Volume: {
    base: "l",
    units: { "Liter (L)": 1, "Milliliter (ml)": 0.001, "Cubic Meter (m³)": 1000, "Cubic Foot (ft³)": 28.3168, "Gallon (US)": 3.78541, "Gallon (UK)": 4.54609, "Barrel (Oil)": 158.987, "TMC (Water)": 28316846592 }
  },
  Weight: {
    base: "kg",
    units: { "Kilogram (kg)": 1, "Gram (g)": 0.001, "Milligram (mg)": 0.000001, "Pound (lb)": 0.453592, "Ounce (oz)": 0.0283495, "Tonne (t)": 1000, "Putti (for Paddy)": 850, "Toom (1/20 Putti)": 42.5, "Bag (for Paddy)": 75, "Quintal": 100, "Candy (500lb)": 226.796, "Thulam (11.66g)": 0.0116638, "Savaran (8g)": 0.008, "Seer": 0.9331 }
  },
  Speed: {
    base: "m/s",
    units: { "Meter/sec (m/s)": 1, "Km/hour (km/h)": 0.277778, "Miles/hour (mph)": 0.44704, "Knot": 0.514444, "Mach (Std Atm)": 340.29 }
  },
  Pressure: {
    base: "Pa",
    units: { "Pascal (Pa)": 1, "Bar": 100000, "ATM": 101325, "PSI": 6894.76, "Torr (mmHg)": 133.322 }
  },
  Power: {
    base: "W",
    units: { "Watt (W)": 1, "Kilowatt (kW)": 1000, "Horsepower (HP-Mech)": 745.7, "Horsepower (HP-Metric)": 735.5 }
  },
  Temperature: { units: { "Celsius (°C)": 1, "Fahrenheit (°F)": 1, "Kelvin (K)": 1 } },
  "Num Sys": { units: { "Decimal (10)": 10, "Binary (2)": 2, "Octal (8)": 8, "Hexadecimal (16)": 16 } }
};

export default function Converter(props) {
  const { HistoryList, onSave, colors, showHistory, globalHistory, onClear, onRemoveItem, onRequestNewTab, pendingLoad, onConsumeLoad, setShowHistory, formatNumber, reportUsage, tabId } = props;

  const [category, setCategory] = useState("Age");

  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Standard/Shared State
  const [val, setVal] = useState("1");
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [result, setResult] = useState("");
  
  // Dynamic Currency State
  const [currencyRates, setCurrencyRates] = useState(UNITS.Currency.units);
  const [lastFetch, setLastFetch] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // BMI State
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiHeight, setBmiHeight] = useState("");
  const [bmiHeightUnit, setBmiHeightUnit] = useState("ft"); 
  const [bmiFt, setBmiFt] = useState(""); 
  const [bmiIn, setBmiIn] = useState("");
  const [bmiResult, setBmiResult] = useState(null);

  // Age/Date/Time State
  const [dobInput, setDobInput] = useState("");
  const [dobTimeInput, setDobTimeInput] = useState("");
  const [ageResult, setAgeResult] = useState(null);
  const [dateMode, setDateMode] = useState("diff");
  const [calcType, setCalcType] = useState("datetime"); 
  const [date1Str, setDate1Str] = useState(""); const [time1Str, setTime1Str] = useState("00:00:00");
  const [date2Str, setDate2Str] = useState(""); const [time2Str, setTime2Str] = useState("00:00:00");
  const [daysInput, setDaysInput] = useState("");
  const [addOp, setAddOp] = useState(true);
  const [dateResult, setDateResult] = useState(null);
  const [tzFrom, setTzFrom] = useState("Asia/Kolkata");
  const [tzTo, setTzTo] = useState("America/New_York");
  const [tzDateStr, setTzDateStr] = useState(""); const [tzTimeStr, setTzTimeStr] = useState("");
  const [tzResult, setTzResult] = useState(null); 

  // Modal & Search State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState("from"); 
  const [searchText, setSearchText] = useState("");

  const autoCalcRef = useRef(null);

  // --- RESTORE DATA ---
useEffect(() => {
  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem(`@tab_data_${tabId}_conv`);
      if (saved) {
        const data = JSON.parse(saved);

        if (data.category) setCategory(data.category);

        if (data.val !== undefined) setVal(String(data.val));
        if (data.fromUnit) setFromUnit(data.fromUnit);
        if (data.toUnit) setToUnit(data.toUnit);
        if (data.result !== undefined) setResult(String(data.result));

        // BMI
        if (data.bmiWeight) setBmiWeight(data.bmiWeight);
        if (data.bmiHeight) setBmiHeight(data.bmiHeight);
        if (data.bmiHeightUnit) setBmiHeightUnit(data.bmiHeightUnit);
        if (data.bmiFt) setBmiFt(data.bmiFt);
        if (data.bmiIn) setBmiIn(data.bmiIn);

        // Age / Date / Time
        if (data.dobInput) setDobInput(data.dobInput);
        if (data.dobTimeInput) setDobTimeInput(data.dobTimeInput);
        if (data.dateMode) setDateMode(data.dateMode);
        if (data.calcType) setCalcType(data.calcType);
        if (data.date1Str) setDate1Str(data.date1Str);
        if (data.date2Str) setDate2Str(data.date2Str);
        if (data.time1Str) setTime1Str(data.time1Str);
        if (data.time2Str) setTime2Str(data.time2Str);
        if (data.daysInput) setDaysInput(data.daysInput);
        if (data.addOp !== undefined) setAddOp(data.addOp);

        // Time Zone
        if (data.tzFrom) setTzFrom(data.tzFrom);
        if (data.tzTo) setTzTo(data.tzTo);
        if (data.tzDateStr) setTzDateStr(data.tzDateStr);
        if (data.tzTimeStr) setTzTimeStr(data.tzTimeStr);

        // ✅ TRIGGER EXISTING AUTO-CALC LOGIC
        autoCalcRef.current =
          data.category === "BMI" ? "BMI" :
          data.category === "Age" ? "Age" :
          data.category === "Date Calc" ? "Date Calc" :
          data.category === "Time Zone" ? "Time Zone" :
          "UNIT";
      }
    } catch (e) {
      // silent
    } finally {
      setDataLoaded(true);
    }
  };

  loadData();
}, [tabId]);

// --- AUTO SAVE ---
useEffect(() => {
  if (!dataLoaded) return;

  const timer = setTimeout(() => {
    const fullState = {
      category,

      // Unit converter
      val,
      fromUnit,
      toUnit,
      result,

      // BMI
      bmiWeight,
      bmiHeight,
      bmiHeightUnit,
      bmiFt,
      bmiIn,

      // Age / Date
      dobInput,
      dobTimeInput,
      dateMode,
      calcType,
      date1Str,
      date2Str,
      time1Str,
      time2Str,
      daysInput,
      addOp,

      // Time Zone
      tzFrom,
      tzTo,
      tzDateStr,
      tzTimeStr
    };

    AsyncStorage.setItem(
      `@tab_data_${tabId}_conv`,
      JSON.stringify(fullState)
    ).catch(() => {});
  }, 800);

  return () => clearTimeout(timer);
}, [
  category,
  val, fromUnit, toUnit, result,
  bmiWeight, bmiHeight, bmiHeightUnit, bmiFt, bmiIn,
  dobInput, dobTimeInput,
  dateMode, calcType,
  date1Str, date2Str,
  time1Str, time2Str,
  daysInput, addOp,
  tzFrom, tzTo, tzDateStr, tzTimeStr,
  tabId,
  dataLoaded
]);


  // Helpers
  const parseDateStr = (str) => {
    if (!str) return null;
    const parts = str.replace(/[\/\.]/g, '-').split('-');
    if (parts.length !== 3) return null;
    return { d: parseInt(parts[0]), m: parseInt(parts[1]), y: parseInt(parts[2]) };
  };
  const parseTimeStr = (str) => {
    if (!str) return { h: 0, m: 0, s: 0 };
    const parts = str.split(':');
    return { h: parseInt(parts[0] || "0"), m: parseInt(parts[1] || "0"), s: parseInt(parts[2] || "0") };
  };

  const loadFromExpression = (expr, data) => {
      if (!expr) return;

        // ✅ UNIT CONVERTERS (Currency, Length, etc.)
      if (data?.val && data?.fromUnit && data?.toUnit) {
        setVal(String(data.val));
        setFromUnit(data.fromUnit);
        setToUnit(data.toUnit);
        autoCalcRef.current = "UNIT";
        return;
      }
      
      if (expr.startsWith("Age: ")) {
          setCategory("Age");
          const datePart = expr.replace("Age: ", "");
          setDobInput(datePart);
          autoCalcRef.current = "Age";
      }
      else if (expr.startsWith("BMI: ")) {
          setCategory("BMI");
          const parts = expr.replace("BMI: ", "").split("kg ");
          if (parts.length > 1) {
              setBmiWeight(parts[0]);
              setBmiHeight(parts[1].replace("cm", ""));
              setBmiHeightUnit("cm");
              autoCalcRef.current = "BMI";
          }
      }
      else if (expr.startsWith("Date Diff: ")) {
          setCategory("Date Calc");
          setDateMode("diff");
          const clean = expr.replace("Date Diff: ", "");
          const dates = clean.split(" to ");
          if (dates.length > 1) {
              setDate1Str(dates[0]);
              setDate2Str(dates[1]);
              setCalcType("date");
              autoCalcRef.current = "Date Calc";
          }
      }
      else if (expr.startsWith("Time Zone: ")) {
          setCategory("Time Zone");
          const clean = expr.replace("Time Zone: ", "");
          const zones = clean.split(" to ");
          if (zones.length > 1) {
             const z1 = TIME_ZONES.find(z => z.label === zones[0])?.id || zones[0];
             const z2 = TIME_ZONES.find(z => z.label === zones[1])?.id || zones[1];
             setTzFrom(z1);
             setTzTo(z2);
            autoCalcRef.current = "Time Zone";
          }
      }
  };

  useEffect(() => {
    const isUsed =  (val && val !== "1") || dobInput || bmiWeight || bmiHeight || bmiFt || bmiIn || daysInput || dateResult || ageResult || bmiResult || tzResult;
    if (reportUsage) reportUsage(tabId, 'conv', isUsed);
  }, [val, dobInput, bmiWeight, bmiHeight, bmiFt, bmiIn, daysInput, dateResult, ageResult, bmiResult, tzResult, reportUsage, tabId]);

  useEffect(() => {
    const now = new Date();
    const dStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const tStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setTzDateStr(dStr); setTzTimeStr(tStr); setDate1Str(dStr); setDate2Str(dStr);
  }, []);

  const fetchCurrencyRates = async (isManual = false) => {
    setIsRefreshing(true);
    if (!isManual) {
        try {
            const cached = await AsyncStorage.getItem('@currency_rates');
            if (cached) {
                const { rates, timestamp } = JSON.parse(cached);
                if (rates) {
                    setCurrencyRates(rates);
                    setLastFetch(timestamp);
                }
            }
        } catch (e) {}
    }
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timeStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            
            setCurrencyRates(data.rates);
            setLastFetch(timeStr);
            await AsyncStorage.setItem('@currency_rates', JSON.stringify({ rates: data.rates, timestamp: timeStr }));
        }
    } catch (e) {
        if (isManual) {
            const cached = await AsyncStorage.getItem('@currency_rates');
            if (cached) {
                const { rates, timestamp } = JSON.parse(cached);
                setCurrencyRates(rates);
                setLastFetch(timestamp);
            }
        }
    } finally {
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isRefreshing) {
        Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();
    } else {
        spinValue.stopAnimation();
        spinValue.setValue(0);
    }
  }, [isRefreshing]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => { if (category === "Currency") { fetchCurrencyRates(false); }}, [category]);
  
  useEffect(() => {
    if (!pendingLoad || pendingLoad.targetTabId !== tabId) return;
    if (pendingLoad.category) { setCategory(pendingLoad.category); }
    loadFromExpression(pendingLoad.expression, pendingLoad.data);
  }, [pendingLoad, tabId]);

useEffect(() => {
  if (!autoCalcRef.current) return;

  let done = false;

  if (autoCalcRef.current === "Age" && dobInput) { calculateAge(); done = true; }

  if (
    autoCalcRef.current === "BMI" &&
    bmiWeight && (bmiHeight || bmiFt || bmiIn)
  ) { calculateBMI(true); done = true; }

  if (
    autoCalcRef.current === "Date Calc" &&
    date1Str && date2Str
  ) { calculateDateDiff(true); done = true; }

  if (
    autoCalcRef.current === "Time Zone" &&
    tzFrom && tzTo && tzDateStr
  ) { calculateTimeZone(true); done = true; }

  if (autoCalcRef.current === "UNIT") { autoCalcRef.current = null; onConsumeLoad();}

  if (done) { autoCalcRef.current = null; onConsumeLoad(); }
  
}, [
  category, dobInput, bmiWeight, bmiHeight, bmiFt, bmiIn, date1Str, date2Str, tzFrom, tzTo, tzDateStr
]);

useEffect(() => {
  if (!onSave) return;
  if (["Age", "BMI", "Date Calc", "Time Zone"].includes(category)) return;
  if (!val || !fromUnit || !toUnit || result === "" || result === "Invalid") return;

  const expr = `${val} ${fromUnit} → ${toUnit}`;
  const res = result;

  onSave(expr, res, "conv", category, { val, fromUnit, toUnit });
}, [result]);

  useEffect(() => {
    if (["Age", "Date Calc", "Time Zone", "BMI"].includes(category)) return;
    if (!CATEGORIES.includes(category)) return;
    const catUnits = category === "Currency" ? currencyRates : UNITS[category]?.units;
    if (!catUnits) return;
    const keys = Object.keys(catUnits);
    if (!keys.includes(fromUnit) || (category === "Currency" && !currencyRates[fromUnit])) { 
        setFromUnit(keys[0]); 
        setToUnit(keys[1] || keys[0]); 
        setVal(category === 'Temperature' ? "0" : "1"); 
    }
  }, [category, currencyRates]);

  useEffect(() => {
    if (["Age", "Date Calc", "Time Zone", "BMI"].includes(category)) return;
    if (val === "" && category !== 'Num Sys') { setResult(""); return; }

    if (category === "Temperature") {
      let v = parseFloat(val);
      if (isNaN(v)) { setResult(""); return; }
      let kelvin = 0;
      if (fromUnit.includes("Celsius")) kelvin = v + 273.15;
      else if (fromUnit.includes("Fahrenheit")) kelvin = (v - 32) * 5/9 + 273.15;
      else kelvin = v; 
      let res = 0;
      if (toUnit.includes("Celsius")) res = kelvin - 273.15;
      else if (toUnit.includes("Fahrenheit")) res = (kelvin - 273.15) * 9/5 + 32;
      else res = kelvin;
      setResult(parseFloat(res.toPrecision(7)).toString());
      return;
    }

    if (category === "Num Sys") {
        const bases = { "Decimal (10)": 10, "Binary (2)": 2, "Octal (8)": 8, "Hexadecimal (16)": 16 };
        const fBase = bases[fromUnit] ?? 10;
        const tBase = bases[toUnit] ?? 10;
        try {
          let str = val.trim();
          const isNegative = str.startsWith("-");
          if (isNegative) str = str.slice(1);
          const [intPart, fracPart, extra] = str.split(".");
          if (extra) throw Error();
          let dec = intPart ? parseInt(intPart, fBase) : 0;
          if (isNaN(dec)) throw Error();
          if (fracPart) {
            [...fracPart].forEach((ch, i) => {
              const d = parseInt(ch, fBase);
              if (isNaN(d)) throw Error();
              dec += d / fBase ** (i + 1);
            });
          }
          let result = Math.floor(dec).toString(tBase).toUpperCase();
          let rem = dec % 1;
          if (rem > 1e-10) {
            result += ".";
            for (let i = 0; rem > 1e-10 && i < 12; i++) {
              rem *= tBase;
              const d = Math.floor(rem);
              result += d.toString(tBase).toUpperCase();
              rem -= d;
            }
          }
          setResult((isNegative ? "-" : "") + result);
        } catch { setResult("Invalid"); }
        return;
    }

    if (!CATEGORIES.includes(category)) return;
    const rates = category === "Currency" ? currencyRates : UNITS[category].units; if (!rates) return;
    if (!rates[fromUnit] || !rates[toUnit]) return;
    
    if (category === "Currency") {
         const valInBase = parseFloat(val) / rates[fromUnit];
         const finalValue = valInBase * rates[toUnit];
         setResult(parseFloat(finalValue.toPrecision(10)).toString());
    } else {
         const baseValue = parseFloat(val) * rates[fromUnit];
         const finalValue = baseValue / rates[toUnit];
         setResult(parseFloat(finalValue.toPrecision(10)).toString());
    }
  }, [val, fromUnit, toUnit, category, currencyRates]);

  const toggleBmiHeightUnit = (unit) => {
      if (unit === bmiHeightUnit) return;
      setBmiHeightUnit(unit);
      if (unit === 'ft') {
          const cm = parseFloat(bmiHeight);
          if (!isNaN(cm)) {
              const totalInches = cm / 2.54;
              const feet = Math.floor(totalInches / 12);
              const inches = Math.round(totalInches % 12);
              setBmiFt(String(feet));
              setBmiIn(String(inches));
          }
      } else {
          const f = parseFloat(bmiFt) || 0;
          const i = parseFloat(bmiIn) || 0;
          if (f || i) {
              const totalCm = (f * 30.48) + (i * 2.54);
              setBmiHeight(Math.round(totalCm).toString());
          }
      }
  };

  const calculateBMI = (isSilent = false) => {
    const w = parseFloat(bmiWeight); 
    let hCm = 0;
    let hFtStr = "";
    if (bmiHeightUnit === 'cm') {
        hCm = parseFloat(bmiHeight);
        if (!isNaN(hCm)) {
             const totalIn = hCm / 2.54;
             const f = Math.floor(totalIn / 12);
             const i = Math.round(totalIn % 12);
             hFtStr = `${f}' ${i}"`;
        }
    } else {
        const f = parseFloat(bmiFt) || 0;
        const i = parseFloat(bmiIn) || 0;
        hCm = (f * 30.48) + (i * 2.54);
        hFtStr = `${f}' ${i}"`;
    }
    if (!w || !hCm) return;
    const hM = hCm / 100; 
    const bmi = w / (hM * hM);
    let cat = "";
    if (bmi < 18.5) cat = "Underweight"; else if (bmi < 25) cat = "Normal"; else if (bmi < 30) cat = "Overweight"; else cat = "Obese";
    setBmiResult({ val: bmi.toFixed(1), cat, weight: w, heightCm: Math.round(hCm), heightFt: hFtStr }); 
    Keyboard.dismiss();
    if (!isSilent && onSave) {
        onSave(`BMI: ${w}kg ${Math.round(hCm)}cm`, `BMI: ${bmi.toFixed(1)} (${cat})`, "conv", "BMI");
    }
  };

  const calculateTimeZone = (isSilent = false) => {
    const dObj = parseDateStr(tzDateStr); const tObj = parseTimeStr(tzTimeStr); if (!dObj) return;
    try {
        const utcBaseInput = Date.UTC(dObj.y, dObj.m - 1, dObj.d, tObj.h, tObj.m, tObj.s);
        const getPartsInZone = (ts, zone) => {
            const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
            const parts = f.formatToParts(ts);
            const get = (type) => parseInt(parts.find(p => p.type === type).value);
            return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
        };
        const currentInZone = getPartsInZone(utcBaseInput, tzFrom);
        const currentAsUTC = Date.UTC(currentInZone.y, currentInZone.m - 1, currentInZone.d, currentInZone.h, currentInZone.min, currentInZone.s);
        const offset = currentAsUTC - utcBaseInput;
        const realTimestamp = utcBaseInput - offset;
        const sourceLabel = TIME_ZONES.find(z => z.id === tzFrom)?.label || tzFrom;
        const sourceShort = sourceLabel.match(/\((.*?)\)/)?.[1] || "SRC";
        
        const results = TIME_ZONES.map(z => {
            const p = getPartsInZone(realTimestamp, z.id);
            const zWallClock = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
            const diffMs = zWallClock - utcBaseInput; 
            let diffStr = "";
            if (z.id === tzFrom) diffStr = "input Zone";
            else {
                const sign = diffMs >= 0 ? "+" : "-";
                const abs = Math.abs(diffMs);
                const h = Math.floor(abs / 3600000);
                const m = Math.floor((abs % 3600000) / 60000);
                diffStr = `${sourceShort}${sign}${h}:${m < 10 ? "0"+m : m}`;
            }
            return { id: z.id, label: z.label, diff: diffStr, time: `${String(p.d).padStart(2,'0')}-${String(p.m).padStart(2,'0')}-${p.y}, ${String(p.h).padStart(2,'0')}:${String(p.min).padStart(2,'0')}`, isInput: z.id === tzFrom, isTarget: z.id === tzTo };
        });

        const inputEntry = results.find(r => r.id === tzFrom);
        const targetEntry = results.find(r => r.id === tzTo);
        const others = results.filter(r => r.id !== tzFrom && r.id !== tzTo);
        let finalSorted = [];
        if (inputEntry) finalSorted.push(inputEntry);
        if (targetEntry && targetEntry.id !== inputEntry?.id) finalSorted.push(targetEntry);
        finalSorted = finalSorted.concat(others);
        setTzResult(finalSorted); Keyboard.dismiss();

        if (!isSilent && onSave && targetEntry) {
            onSave(`Time Zone: ${inputEntry.label} to ${targetEntry.label}`, `${targetEntry.time}`, "conv", "Time Zone");
        }
    } catch (e) { alert("Invalid Date/Time"); }
  };

  const calculateDateDiff = (isSilent = false) => {
      const now = new Date(); const defD = { d: now.getDate(), m: now.getMonth()+1, y: now.getFullYear() }; const defT = { h: 0, m: 0, s: 0 };
      const d1 = calcType!=='time'?(parseDateStr(date1Str)||defD):defD; const t1 = calcType!=='date'?parseTimeStr(time1Str):defT;
      const d2 = calcType!=='time'?(parseDateStr(date2Str)||defD):defD; const t2 = calcType!=='date'?parseTimeStr(time2Str):defT;
      const date1 = new Date(d1.y, d1.m-1, d1.d, t1.h, t1.m, t1.s); const date2 = new Date(d2.y, d2.m-1, d2.d, t2.h, t2.m, t2.s);
      let diff = Math.abs(date2 - date1);
      const totalSeconds = Math.floor(diff/1000); const totalMinutes = Math.floor(diff/60000); const totalHours = Math.floor(diff/3600000); const totalDays = Math.floor(diff/86400000);
      let detailed = "";
      if (calcType === 'time') { detailed = `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m ${Math.floor((diff%60000)/1000)}s`; }
      else {
          let d1c = new Date(date1<date2?date1:date2); let d2c = new Date(date1<date2?date2:date1);
          let y = d2c.getFullYear()-d1c.getFullYear(); let m = d2c.getMonth()-d1c.getMonth(); let d = d2c.getDate()-d1c.getDate();
          if (d<0) { m--; d+=new Date(d2c.getFullYear(),d2c.getMonth(),0).getDate(); } if (m<0) { y--; m+=12; }
          detailed = `${y}y ${m}m ${Math.floor(d/7)}w ${d%7}d`;
          if (calcType === 'datetime') detailed += `  ${d2c.getHours()-d1c.getHours()}h ${d2c.getMinutes()-d1c.getMinutes()}m`;
      }
      setDateResult({ type: 'diff', text: detailed, totalDays, totalHours, totalMinutes, totalSeconds }); Keyboard.dismiss();
      if (!isSilent && onSave) {
          onSave(`Date Diff: ${date1Str} to ${date2Str}`, detailed, "conv", "Date Calc");
      }
  };
  const calculateDateAdd = () => {
      const d1 = parseDateStr(date1Str); const D = daysInput; if (!d1 || !D) return;
      const date = new Date(d1.y, d1.m-1, d1.d);
      if (addOp) date.setDate(date.getDate() + parseInt(D)); else date.setDate(date.getDate() - parseInt(D));
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setDateResult({ type: 'add', date: `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}`, weekday: days[date.getDay()] }); Keyboard.dismiss();
  };

  const calculateAge = (overrideInput) => {
    const input = typeof overrideInput === 'string' ? overrideInput : dobInput;
    const d = parseDateStr(input); if (!d) return;
    const t = parseTimeStr(dobTimeInput); 
    const now = new Date(); 
    const birthDate = new Date(d.y, d.m-1, d.d, t.h, t.m, t.s);
    let y = now.getFullYear() - birthDate.getFullYear();
    let m = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    let h = now.getHours() - birthDate.getHours();
    let min = now.getMinutes() - birthDate.getMinutes();
    if (min < 0) { h--; min += 60; }
    if (h < 0) { days--; h += 24; }
    if (days < 0) { m--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const diffMs = Math.max(0, now - birthDate);
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(diffMs / 3600000);
    const totalDays = Math.floor(diffMs / 86400000);
    const totalWeeks = Math.floor(diffMs / (86400000 * 7));
    const totalMonths = (y * 12) + m;
    const ageStr = `${y}Y ${m}M ${days}D`;
    setAgeResult({ 
        years: y, months: m, days, hours: h, minutes: min,
        totalMonths, totalWeeks, totalDays, totalHours, totalMinutes, totalSeconds
    }); 
    Keyboard.dismiss();
    if (typeof overrideInput !== 'string' && onSave) { onSave(`Age: ${input}`, ageStr, "conv", "Age"); }
  };

  const openModal = (target) => { 
    setSelectingFor(target); 
    setSearchText(""); 
    setModalVisible(true); 
  };
  
  const handleSelect = (item) => {
    if (selectingFor === "from") setFromUnit(item);
    else if (selectingFor === "to") setToUnit(item);
    else if (selectingFor === "tzFrom") setTzFrom(item);
    else if (selectingFor === "tzTo") setTzTo(item);
    setModalVisible(false);
  };
  
  const getDisplayUnit = (unit) => {
      if (category === "Currency" && CURRENCY_NAMES[unit]) {
          return `${CURRENCY_NAMES[unit]} (${unit})`;
      }
      return unit;
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    catWrap: { maxHeight: 95 }, 
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 2, justifyContent: 'center' }, 
    catBtn: { margin: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: colors.subTab },
    catBtnActive: { backgroundColor: colors.accent },
    catText: { fontWeight: '600', color: colors.secTxt, fontSize: 13 },
    catTextActive: { color: 'white' },
    convRow: { backgroundColor: colors.btn, padding: 20, borderRadius: 15, elevation: 2 },
    label: { color: colors.secTxt, fontSize: 14, marginBottom: 5 },
    unitText: { color: colors.accent, fontSize: 16, fontWeight: 'bold' },
    inputBig: { fontSize: 40, fontWeight: 'bold', color: colors.txt, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    resultBig: { fontSize: 40, fontWeight: 'bold', color: colors.txt },
    singleInput: { backgroundColor: colors.btn, color: colors.txt, padding: 12, borderRadius: 10, fontSize: 18, textAlign: 'center', borderWidth: 1, borderColor: '#333', flex: 1 },
    modalContent: { backgroundColor: colors.menuBg || colors.btn, padding: 20, borderRadius: 20, maxHeight: '60%', flex: 1 },
    modalText: { color: colors.txt, fontSize: 16},
    calcBtn: { backgroundColor: colors.accent, paddingVertical: 15, borderRadius: 25, width: '100%', alignItems: 'center', marginTop: 15 },
    calcBtnTxt: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    resRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, paddingVertical: 2 },
    resLabel: { color: colors.secTxt, fontSize: 14 },
    resVal: { color: colors.txt, fontSize: 14, fontWeight: 'bold' },
    modeBar: { flexDirection: 'row', backgroundColor: colors.btn, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor:'#333' },
    modeBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 9 },
    modeTxt: { fontWeight: 'bold' },
    tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.secTxt, marginBottom: 5 },
    tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.subTab },
    th: { color: colors.accent, fontWeight: 'bold', fontSize: 12 },
    td: { color: colors.txt, fontSize: 13 },
    tdSub: { color: colors.secTxt, fontSize: 12 }
  });

  if (showHistory) { return ( <HistoryList history={globalHistory} colors={colors} formatNumber={formatNumber} onRemoveItem={onRemoveItem} onClear={onClear} onSelect={onRequestNewTab} /> ); }

  return (
    <View style={s.container}>
      <View style={s.catWrap}>
        <ScrollView contentContainerStyle={s.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} style={[s.catBtn, category === cat && s.catBtnActive]} onPress={() => setCategory(cat)}>
              <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {category === "Age" ? (
          <View>
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                <View style={{ flex: 1.5 }}>
                    <Text style={[s.label, {textAlign: 'left', fontWeight: 'bold', color: colors.accent}]}>Date of Birth</Text>
                    <TextInput style={s.singleInput} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} value={dobInput} onChangeText={setDobInput} keyboardType="numbers-and-punctuation"/>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.label, {textAlign: 'left', fontWeight: 'bold', color: colors.accent}]}>Time (Optional)</Text>
                    <TextInput style={s.singleInput} placeholder="HH:MM" placeholderTextColor={colors.secTxt} value={dobTimeInput} onChangeText={setDobTimeInput} keyboardType="numbers-and-punctuation"/>
                </View>
            </View>
            <TouchableOpacity style={s.calcBtn} onPress={() => calculateAge()}><Text style={s.calcBtnTxt}>Calculate</Text></TouchableOpacity>
            
            {ageResult && (
                <View style={{marginTop: 30}}>
                    <View style={{alignItems:'center', marginBottom: 25}}>
                        <Text style={{fontSize: 26, fontWeight:'bold', color: colors.txt, textAlign: 'center'}}>
                            {ageResult.years} Years  {ageResult.months} Months  {ageResult.days} Days
                        </Text>
                        {dobTimeInput ? (
                            <Text style={{fontSize: 20, color: colors.accent, marginTop: 5, fontWeight:'600'}}>
                                {ageResult.hours} Hours  {ageResult.minutes} Minutes
                            </Text>
                        ) : null}
                    </View>

                    <View style={{ backgroundColor: colors.btn, padding: 15, borderRadius: 15 }}>
                        <Text style={{color: colors.accent, fontWeight: 'bold', marginBottom: 10}}>Summary</Text>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Months</Text><Text style={s.resVal}>{formatNumber(ageResult.totalMonths)}</Text></View>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Weeks</Text><Text style={s.resVal}>{formatNumber(ageResult.totalWeeks)}</Text></View>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Days</Text><Text style={s.resVal}>{formatNumber(ageResult.totalDays)}</Text></View>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Hours</Text><Text style={s.resVal}>{formatNumber(ageResult.totalHours)}</Text></View>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Minutes</Text><Text style={s.resVal}>{formatNumber(ageResult.totalMinutes)}</Text></View>
                        <View style={s.resRow}><Text style={s.resLabel}>Total Seconds</Text><Text style={s.resVal}>{formatNumber(ageResult.totalSeconds)}</Text></View>
                    </View>
                </View>
            )}
          </View>
        ) : category === "BMI" ? (
          <View>
             <View style={{flexDirection: 'row', gap: 15, marginBottom: 20}}>
                <View style={{flex: 1}}>
                    <Text style={[s.label, {fontWeight:'bold', color: colors.accent}]}>Weight (kg)</Text>
                    <TextInput style={s.singleInput} value={bmiWeight} onChangeText={setBmiWeight} keyboardType="numeric" placeholder="kg" placeholderTextColor={colors.secTxt}/>
                </View>
                <View style={{flex: 1}}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                         <Text style={[s.label, {fontWeight:'bold', color: colors.accent, marginBottom:0}]}>Height</Text>
                         <View style={{flexDirection:'row', backgroundColor: colors.subTab, borderRadius: 8, overflow:'hidden'}}>
                            <TouchableOpacity onPress={()=>toggleBmiHeightUnit('cm')} style={{paddingHorizontal:8, paddingVertical:2, backgroundColor: bmiHeightUnit==='cm'?colors.accent:'transparent'}}><Text style={{fontSize:12, fontWeight:'bold', color: bmiHeightUnit==='cm'?'white':colors.secTxt}}>CM</Text></TouchableOpacity>
                            <TouchableOpacity onPress={()=>toggleBmiHeightUnit('ft')} style={{paddingHorizontal:8, paddingVertical:2, backgroundColor: bmiHeightUnit==='ft'?colors.accent:'transparent'}}><Text style={{fontSize:12, fontWeight:'bold', color: bmiHeightUnit==='ft'?'white':colors.secTxt}}>FT</Text></TouchableOpacity>
                         </View>
                    </View>
                    {bmiHeightUnit === 'cm' ? (
                        <TextInput style={s.singleInput} value={bmiHeight} onChangeText={setBmiHeight} keyboardType="numeric" placeholder="cm" placeholderTextColor={colors.secTxt}/>
                    ) : (
                        <View style={{flexDirection:'row', gap: 5}}>
                            <TextInput style={s.singleInput} value={bmiFt} onChangeText={setBmiFt} keyboardType="numeric" placeholder="Ft" placeholderTextColor={colors.secTxt}/>
                            <TextInput style={s.singleInput} value={bmiIn} onChangeText={setBmiIn} keyboardType="numeric" placeholder="In" placeholderTextColor={colors.secTxt}/>
                        </View>
                    )}
                </View>
             </View>
             
             <TouchableOpacity style={s.calcBtn} onPress={() => calculateBMI()}><Text style={s.calcBtnTxt}>Calculate</Text></TouchableOpacity>
             {bmiResult && (
                 <View style={{marginTop: 30, alignItems:'center'}}>
                     <Text style={{fontSize: 50, fontWeight:'bold', color: colors.accent}}>{bmiResult.val}</Text>
                     <Text style={{fontSize: 22, color: colors.txt, marginTop: 5}}>{bmiResult.cat}</Text>
                     <View style={{marginTop: 20, width: '100%', backgroundColor: colors.btn, padding: 15, borderRadius: 15}}>
                        <View style={s.resRow}>
                             <Text style={s.resLabel}>Total Weight</Text>
                             <Text style={s.resVal}>{bmiResult.weight} kg</Text>
                        </View>
                        <View style={s.resRow}>
                             <Text style={s.resLabel}>Total Height</Text>
                             <Text style={s.resVal}>{bmiResult.heightCm} cm / {bmiResult.heightFt}</Text>
                        </View>
                     </View>
                 </View>
             )}
          </View>
        ) : category === "Time Zone" ? (
            <View>
                <Text style={s.label}>From Zone</Text>
                <TouchableOpacity onPress={() => openModal("tzFrom")} style={[s.convRow, { marginBottom: 20, padding: 15 }]}><Text style={s.unitText}>{TIME_ZONES.find(t => t.id === tzFrom)?.label || tzFrom} ▼</Text></TouchableOpacity>
                <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
                    <View style={{flex: 1.5}}><Text style={s.label}>Date (DD-MM-YYYY)</Text><TextInput style={s.singleInput} value={tzDateStr} onChangeText={setTzDateStr} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View>
                    <View style={{flex: 1}}><Text style={s.label}>Time (HH:MM)</Text><TextInput style={s.singleInput} value={tzTimeStr} onChangeText={setTzTimeStr} placeholder="HH:MM:SS" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View>
                </View>
                <Text style={s.label}>To Zone (Highlight in Output)</Text>
                <TouchableOpacity onPress={() => openModal("tzTo")} style={[s.convRow, { marginBottom: 20, padding: 15 }]}><Text style={s.unitText}>{TIME_ZONES.find(t => t.id === tzTo)?.label || tzTo} ▼</Text></TouchableOpacity>
                <TouchableOpacity style={s.calcBtn} onPress={() => calculateTimeZone()}><Text style={s.calcBtnTxt}>Calculate</Text></TouchableOpacity>
                {tzResult && (<View style={{marginTop: 20}}><View style={s.tableHeader}><Text style={[s.th, {flex: 2}]}>Zone</Text><Text style={[s.th, {flex: 1.5}]}>Diff</Text><Text style={[s.th, {flex: 2, textAlign:'right'}]}>Date, Time</Text></View>{tzResult.map((item) => (<View key={item.id} style={s.tableRow}><Text style={[s.td, {flex: 2, fontWeight: (item.isInput || item.isTarget) ? 'bold' : 'normal'}, item.isTarget ? {color: colors.accent} : {}]}>{item.label}</Text><Text style={[s.tdSub, {flex: 1.5}]}>{item.diff}</Text><Text style={[s.td, {flex: 2, textAlign:'right'}, item.isTarget ? {color: colors.accent, fontWeight:'bold'} : {}]}>{item.time}</Text></View>))}</View>)}
            </View>
        ) : category === "Date Calc" ? (
          <View>
             <View style={s.modeBar}><TouchableOpacity onPress={()=>setDateMode('diff')} style={[s.modeBtn, {backgroundColor: dateMode==='diff'?colors.accent:'transparent'}]}><Text style={[s.modeTxt, {color: dateMode==='diff'?'white':colors.secTxt}]}>Diff</Text></TouchableOpacity><TouchableOpacity onPress={()=>setDateMode('add')} style={[s.modeBtn, {backgroundColor: dateMode==='add'?colors.accent:'transparent'}]}><Text style={[s.modeTxt, {color: dateMode==='add'?'white':colors.secTxt}]}>Add/Sub</Text></TouchableOpacity></View>
            {dateMode === 'diff' ? (
                <View>
                    <View style={[s.modeBar, { marginTop: -10, marginBottom: 20 }]}>{['date', 'time', 'datetime'].map(t => (<TouchableOpacity key={t} onPress={()=>setCalcType(t)} style={[s.modeBtn, {backgroundColor: calcType===t?colors.accent:'transparent'}]}><Text style={[s.modeTxt, {color: calcType===t?'white':colors.secTxt, textTransform:'capitalize'}]}>{t === 'datetime' ? 'Both' : t}</Text></TouchableOpacity>))}</View>
                    <View style={{marginBottom: 15, flexDirection: 'row', gap: 10}}>{calcType !== 'time' && ( <View style={{flex:1.5}}><Text style={s.label}>Start Date</Text><TextInput style={s.singleInput} value={date1Str} onChangeText={setDate1Str} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View> )}{calcType !== 'date' && ( <View style={{flex:1}}><Text style={s.label}>Time</Text><TextInput style={s.singleInput} value={time1Str} onChangeText={setTime1Str} placeholder="HH:MM:SS" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View> )}</View>
                    <View style={{marginBottom: 15, flexDirection: 'row', gap: 10}}>{calcType !== 'time' && ( <View style={{flex:1.5}}><Text style={s.label}>End Date</Text><TextInput style={s.singleInput} value={date2Str} onChangeText={setDate2Str} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View> )}{calcType !== 'date' && ( <View style={{flex:1}}><Text style={s.label}>Time</Text><TextInput style={s.singleInput} value={time2Str} onChangeText={setTime2Str} placeholder="HH:MM:SS" placeholderTextColor={colors.secTxt} keyboardType="numbers-and-punctuation"/></View> )}</View>
                    <TouchableOpacity style={s.calcBtn} onPress={() => calculateDateDiff()}><Text style={s.calcBtnTxt}>Calculate</Text></TouchableOpacity>
                    {dateResult && dateResult.type === 'diff' && (<View style={{ marginTop: 20, backgroundColor: colors.btn, padding: 15, borderRadius: 15 }}><Text style={{color: colors.accent, fontWeight:'bold', fontSize: 18, marginBottom: 15, textAlign:'center'}}>{dateResult.text}</Text>{calcType !== 'time' && <View style={s.resRow}><Text style={s.resLabel}>Total Days</Text><Text style={s.resVal}>{formatNumber(dateResult.totalDays)}</Text></View>}<View style={s.resRow}><Text style={s.resLabel}>Total Hours</Text><Text style={s.resVal}>{formatNumber(dateResult.totalHours)}</Text></View><View style={s.resRow}><Text style={s.resLabel}>Total Minutes</Text><Text style={s.resVal}>{formatNumber(dateResult.totalMinutes)}</Text></View></View>)}
                </View>
            ) : (
                <View>
                   <Text style={s.label}>Start Date (DD-MM-YYYY)</Text><View style={{ marginBottom: 20 }}><TextInput style={s.singleInput} placeholder="DD-MM-YYYY" placeholderTextColor={colors.secTxt} value={date1Str} onChangeText={setDate1Str} keyboardType="numbers-and-punctuation"/></View>
                    <View style={{flexDirection:'row', gap: 10, alignItems:'center'}}><TouchableOpacity onPress={()=>setAddOp(!addOp)} style={{backgroundColor: colors.subTab, padding: 15, borderRadius: 10}}><Text style={{color: colors.txt, fontWeight:'bold', fontSize: 20}}>{addOp ? "+" : "-"}</Text></TouchableOpacity><TextInput style={[s.inputBig, {flex:1, fontSize: 24, textAlign:'center'}]} value={daysInput} onChangeText={setDaysInput} placeholder="Days" placeholderTextColor={colors.secTxt} keyboardType="numeric"/></View>
                    <TouchableOpacity style={s.calcBtn} onPress={calculateDateAdd}><Text style={s.calcBtnTxt}>Calculate</Text></TouchableOpacity>
                    {dateResult && dateResult.type === 'add' && (<View style={{ marginTop: 20, alignItems: 'center' }}><Text style={{fontSize: 32, fontWeight:'bold', color: colors.txt}}>{dateResult.date}</Text><Text style={{color: colors.accent, fontSize: 18}}>{dateResult.weekday}</Text></View>)}
                </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {category === 'Currency' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Text style={{ color: colors.secTxt, fontSize: 12}}>
                    Last updated: {lastFetch || "Never"}
                 </Text>
                 <TouchableOpacity onPress={() => fetchCurrencyRates(true)} disabled={isRefreshing}>
                    <Animated.Text style={{ color: colors.accent, fontSize: 18, transform: [{ rotate: spin }] }}>
                       ↻
                    </Animated.Text>
                 </TouchableOpacity>
              </View>
            )}
            <View style={s.convRow}>
              <Text style={s.label}>From</Text>
              <TouchableOpacity onPress={() => openModal("from")} style={{marginBottom: 10}}><Text style={s.unitText}>{getDisplayUnit(fromUnit)} ▼</Text></TouchableOpacity>
              <TextInput style={[s.inputBig, category==='Num Sys' && {fontSize: 30}]} value={val} onChangeText={setVal} keyboardType={category === 'Num Sys' ? "default" : "numeric"} autoCapitalize="characters" />
            </View>
            <View style={s.convRow}>
              <Text style={s.label}>To</Text>
              <TouchableOpacity onPress={() => openModal("to")} style={{marginBottom: 10}}><Text style={s.unitText}>{getDisplayUnit(toUnit)} ▼</Text></TouchableOpacity>
              <Text style={[s.resultBig, category==='Num Sys' && {fontSize: 30}]} numberOfLines={1} adjustsFontSizeToFit>{category === 'Num Sys' ? result : formatNumber(result, 6)}</Text>
            </View>

            {/* MAJOR CURRENCIES TABLE */}
            {category === 'Currency' && currencyRates && (
                <View style={{ marginTop: 20 }}>
                    <Text style={{color: colors.accent, fontWeight:'bold', marginBottom: 10, fontSize:16}}>Common Conversions</Text>
                    <View style={s.tableHeader}>
                        <Text style={[s.th, {flex: 1.5}]}>Currency</Text>
                        <Text style={[s.th, {flex: 1, textAlign: 'right'}]}>Value</Text>
                    </View>
                    {MAJOR_CURRENCIES.map((code) => {
                        if (!currencyRates[code]) return null;
                        const rate = (1 / currencyRates[fromUnit]) * currencyRates[code];
                        return (
                            <View key={code} style={s.tableRow}>
                                <Text style={[s.td, {flex: 1.5}]}>
                                    {CURRENCY_NAMES[code] ? `${CURRENCY_NAMES[code]} (${code})` : code}
                                </Text>
                                <Text style={[s.td, {flex: 2, textAlign: 'right', fontWeight:'bold'}]}>
                                    1 ({fromUnit}) = {formatNumber(rate, 3)} ({code})
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={s.modalContent}>
            <Text style={{color:colors.txt, textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:10}}>Select</Text>
            
            <TextInput
                style={{ backgroundColor: colors.subTab, color: colors.txt, padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 16 }}
                placeholder="Search..."
                placeholderTextColor={colors.secTxt}
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
            />

            <FlatList
              data={(() => {
                 const isTz = ['tzFrom', 'tzTo'].includes(selectingFor);
                 const list = isTz ? TIME_ZONES : Object.keys(category === "Currency" ? currencyRates : (UNITS[category]?.units || {}));
                 
                 if (!searchText) return list;
                 
                 const lower = searchText.toLowerCase();
                 return list.filter(item => {
                    const val = isTz ? item.label : (category === "Currency" && CURRENCY_NAMES[item] ? `${CURRENCY_NAMES[item]} ${item}` : item);
                    return val.toLowerCase().includes(lower);
                 });
              })()}
              keyExtractor={(item) => item.id || item}
              renderItem={({ item }) => (
                <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.subTab }} onPress={() => handleSelect(item.id || item)}>
                  <Text style={s.modalText}>{
                      selectingFor === 'tzFrom' || selectingFor === 'tzTo' 
                      ? (item.label || item) 
                      : (category === "Currency" && CURRENCY_NAMES[item] ? `${CURRENCY_NAMES[item]} (${item})` : item)
                  }</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled" 
            />
            <TouchableOpacity style={{ marginTop: 15, alignItems: 'center', padding: 10 }} onPress={() => setModalVisible(false)}><Text style={{color: 'red'}}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}