import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ScrollView } from "react-native";

const ZWS = "\u200B";

const SCI_LAYOUT = [
  ["2nd", "deg", "sin", "cos", "tan"],
  ["x^y", "lg", "ln", "(", ")"],
  ["√", "C", "⌫", "%", "÷"],
  ["x!", "7", "8", "9", "×"],
  ["1/x", "4", "5", "6", "-"],
  ["π", "1", "2", "3", "+"],
  ["TOGGLE", "e", "0", ".", "="],
];

const STD_LAYOUT = [
  ["C", "⌫", "R", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["TOGGLE", "0", ".", "="],
];

const calculate = (expr, isDegree) => {
  if (!expr) return "0";
  
  let clean = expr.replace(new RegExp(ZWS, "g"), "")
                  .replace(/×/g, "*")
                  .replace(/÷/g, "/");

  while (["/", "*", "-", "+", "^", "."].includes(clean.slice(-1))) {
    clean = clean.slice(0, -1);
  }

  if (clean.slice(-1) === "(") return "Error";
  if (!clean) return "0";

  try {
    let p = clean;
    p = p.replace(/(\d)\s*\(/g, "$1*(")
         .replace(/\)\s*\(/g, ")*(")
         .replace(/\)\s*(\d)/g, ")*$1")
         .replace(/(\d|\))\s*π/g, "$1*π")
         .replace(/(\d|\))\s*e/g, "$1*e")
         .replace(/(\d)\s*(sin|cos|tan|lg|ln|√)/g, "$1*$2");

    p = p.replace(/sin⁻¹\(/g, "TOKEN_ASIN(")
         .replace(/cos⁻¹\(/g, "TOKEN_ACOS(")
         .replace(/tan⁻¹\(/g, "TOKEN_ATAN(")
         .replace(/sin\(/g, "TOKEN_SIN(")
         .replace(/cos\(/g, "TOKEN_COS(")
         .replace(/tan\(/g, "TOKEN_TAN(")
         .replace(/lg\(/g, "Math.log10(")
         .replace(/ln\(/g, "Math.log(")
         .replace(/√/g, "Math.sqrt");

    p = p.replace(/(\d+(?:\.\d+)?)([\+\-])(\d+(?:\.\d+)?)%/g, (match, n1, op, n2) => `${n1}${op}(${n1}*${n2}/100)`)
         .replace(/%/g, "/100")
         .replace(/\^/g, "**")
         .replace(/π/g, "Math.PI")
         .replace(/e/g, "Math.E")
         .replace(/R/g, "%");

    if (isDegree) {
      p = p.replace(/TOKEN_ASIN\(/g, "(180/Math.PI)*Math.asin(")
           .replace(/TOKEN_ACOS\(/g, "(180/Math.PI)*Math.acos(")
           .replace(/TOKEN_ATAN\(/g, "(180/Math.PI)*Math.atan(")
           .replace(/TOKEN_SIN\(/g, "Math.sin((Math.PI/180)*")
           .replace(/TOKEN_COS\(/g, "Math.cos((Math.PI/180)*")
           .replace(/TOKEN_TAN\(/g, "Math.tan((Math.PI/180)*");
    } else {
      p = p.replace(/TOKEN_ASIN\(/g, "Math.asin(")
           .replace(/TOKEN_ACOS\(/g, "Math.acos(")
           .replace(/TOKEN_ATAN\(/g, "Math.atan(")
           .replace(/TOKEN_SIN\(/g, "Math.sin(")
           .replace(/TOKEN_COS\(/g, "Math.cos(")
           .replace(/TOKEN_TAN\(/g, "Math.tan(");
    }

    const openCount = (p.match(/\(/g) || []).length;
    const closeCount = (p.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      p += ")".repeat(openCount - closeCount);
    }

    p = p.replace(/(\d+)!(?!\d)/g, (match, num) => {
      let n = +num, r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r.toString();
    });

    const res = eval(p);
    
    if (!isFinite(res) || isNaN(res)) return "Error";
    return parseFloat(res.toFixed(8)).toString();
  } catch (e) {
    return "Error";
  }
};

const useCalc = (tabId, pendingLoad, onConsumeLoad, onCalc) => {
const [input, setInput] = useState("");
const [result, setResult] = useState("0");
const [done, setDone] = useState(false);
const [sel, setSel] = useState({ start: 0, end: 0 });
const [isDegree, setIsDegree] = useState(true);
const [is2nd, setIs2nd] = useState(false);

  useEffect(() => {
    if (pendingLoad && pendingLoad.targetTabId === tabId) {
      const isNotMath = pendingLoad.expression.match(/^(EMI:|Stock Avg:|Reg Int:|Age:|Simple Int:|Compound Int:)| to /);
      if (isNotMath) return; 

      setInput(pendingLoad.expression);
      setDone(false);
      setSel({ start: pendingLoad.expression.length, end: pendingLoad.expression.length });
      onConsumeLoad();
    }
  }, [pendingLoad]);

  useEffect(() => {
    if (!done) {
      const calcRes = calculate(input, isDegree);
      setResult(calcRes === "Error" ? "" : calcRes);
    }
  }, [input, done, isDegree]);

  const press = (v) => {
    const { start, end } = sel;

    if (v === "deg") { setIsDegree(!isDegree); return; }
    if (v === "2nd") { setIs2nd(!is2nd); return; }

    if (v === "C") {
      setInput("");
      setResult("0");
      setDone(false);
      setSel({ start: 0, end: 0 });
      return;
    }
    if (v === "⌫") {
      setDone(false);
      let diff = 1;
      if (start === end && start > 0 && input[start - 1] === ZWS) diff = 2;
      const p = start === end ? start - diff : start;
      if (p < 0) return;
      setInput(input.substring(0, p) + input.substring(end));
      setSel({ start: p, end: p });
      return;
    }
    
    if (v === "=") {
      const res = calculate(input, isDegree);
      if (res !== "Error" && input) {
        setResult(res);
        onCalc(input.replace(new RegExp(ZWS, "g"), ""), res);
        setDone(true);
      }
      return;
    }

    setDone(false);
    let ins = v;

    if (["sin", "cos", "tan"].includes(v)) {
      ins = is2nd ? v + "⁻¹(" : v + "(";
    } 
    else if (v === "lg") ins = is2nd ? "10^(" : "lg(";
    else if (v === "ln") ins = is2nd ? "e^(" : "ln(";
    else if (v === "√")  ins = is2nd ? "^2" : "√(";
    else if (v === "÷")  ins = is2nd ? "R" : "÷";
    else if (v === "x^y") ins = "^";
    else if (v === "x!") ins = "!";
    else if (v === "1/x") ins = "1÷";

    if (["÷", "×", "-", "+", "%", "^", "R"].includes(ins)) ins += ZWS;

    const isOp = (s) => ["÷", "×", "-", "+", "%", "^"].includes(s);
    const rawIns = ins.replace(ZWS, "");
    
    if (!done && start === input.length && isOp(rawIns)) {
      if (input.endsWith(ZWS)) {
         const prevOp = input.slice(-2, -1);
         if (isOp(prevOp)) {
            const newInput = input.slice(0, -2) + ins;
            setInput(newInput);
            setSel({ start: newInput.length, end: newInput.length });
            return; 
         }
      }
    }

    const isContinuationOp = ["÷", "×", "-", "+", "%", "^", "!", "R"].includes(ins.replace(ZWS, ""));

    let ni, ns;

    if (done && isContinuationOp) { ni = result + ins; ns = ni.length; } 
    else if (done) { ni = ins; ns = ins.length; } 
    else { ni = input.substring(0, start) + ins + input.substring(end); ns = start + ins.length; }

    setInput(ni);
    setSel({ start: ns, end: ns });
  };

  return { input, result, done, sel, setSel, press, setDone, setInput, isDegree, is2nd, setIs2nd };
};

export default function CalculatorTab(props) {
  const { input, result, done, sel, setSel, press, setDone, setInput, isDegree, is2nd, setIs2nd } = useCalc(
    props.tabId, props.pendingLoad, props.onConsumeLoad, props.onCalculate
  );
  
  const { formatNumber } = props; // Received from App.js

  const [sci, setSci] = useState(false);
  const scrollViewRef = useRef(null);
  const lay = sci ? SCI_LAYOUT : STD_LAYOUT;
  const colors = props.colors;

  if (!props.isActive) return <View style={{ display: "none" }} />;

  const handleHistorySelect = (expression) => {
    const isTabEmpty = input === "" || input === "0";
    const isOtherModule = expression.match(/^(EMI:|Stock Avg:|Reg Int:|Age:|Simple Int:|Compound Int:)| to /);

    if (isTabEmpty && !isOtherModule) {
      setInput(expression);
      setDone(false);
      setSel({ start: expression.length, end: expression.length });
      if (props.setShowHistory) props.setShowHistory(false);
    } else {
      props.onRequestNewTab(expression, isTabEmpty);
    }
  };

  if (props.showHistory) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 15 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: colors.secTxt, fontWeight: 'bold' }}>HISTORY</Text>
          {props.globalHistory.length > 0 && (
            <TouchableOpacity onPress={props.onClear}>
              <Text style={{ color: 'red', fontWeight: 'bold' }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={props.globalHistory.slice().reverse()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.btn, borderRadius: 15, padding: 15, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => handleHistorySelect(item.expression)} style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.secTxt, fontSize: 12 }}>{item.time}</Text>
                </View>
                <Text style={{ color: colors.txt, fontSize: 16, marginTop: 5 }}>{item.expression}</Text>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "bold", textAlign: "right", marginTop: 5 }}>
                  = {formatNumber(item.result, 10)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ position: "absolute", top: 10, right: 15 }} onPress={() => props.onRemoveItem(item.id)}>
                <Text style={{ color: colors.secTxt, fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: colors.secTxt, textAlign: "center", marginTop: 50 }}>No history yet.</Text>}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 0.35, paddingHorizontal: 10 }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            alignItems: "flex-end",
            paddingVertical: 10,
          }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={true}
        >
          <TextInput
            style={{
              textAlign: "right", 
              width: "100%",
              fontSize: input.length < 12 ? 30 : input.length < 18 ? 28 : 22,
              color: done ? colors.secTxt : colors.txt,
            }}
            value={input}
            multiline
            inputMode="none"
            showSoftInputOnFocus={false}
            scrollEnabled={false}
            onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            onTouchStart={() => setDone(false)}
            selection={sel}
          />
        </ScrollView>
        <Text
          style={{
            textAlign: "right", width: "100%",
            fontSize: done ? 28 : 22, fontWeight: done ? "600" : "400",
            color: done ? colors.txt : colors.secTxt,
            marginBottom: 5
          }}
        >
          {done ? "= " : ""}{formatNumber(result, 10)}
        </Text>
      </View>

      <View style={{ flex: 0.65, padding: 10, gap: 8 }}>
        {lay.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: 8, flex: 1 }}>
            {row.map((b, c) => {
              const isOrange = ["C", "⌫", "R", "%", "÷", "×", "-", "+"].includes(b);
              const isEq = b === "=";
              const isTog = b === "TOGGLE";

              let label = b;
              if (b === "deg") label = isDegree ? "deg" : "rad";
              if (b === "2nd") label = "2nd";
              
              if (is2nd) {
                if (b === "sin") label = "sin⁻¹";
                if (b === "cos") label = "cos⁻¹";
                if (b === "tan") label = "tan⁻¹";
                if (b === "lg")  label = "10ˣ";
                if (b === "ln")  label = "eˣ";
                if (b === "√")   label = "x²";
                if (b === "÷")   label = "R";
              }

              return (
                <TouchableOpacity
                  key={c}
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (isTog) {
                      if (sci) setIs2nd(false); 
                      setSci(!sci);
                    } else {
                      press(b);
                    }
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isEq
                        ? colors.equals
                        : (b === "2nd" && is2nd) ? colors.accent
                        : colors.btn,
                      borderRadius: 16,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: sci ? 18 : 28,
                        color: isEq
                          ? "white"
                          : (b === "2nd" && is2nd) ? "white"
                          : isOrange
                          ? colors.accent
                          : colors.txt,
                      }}
                    >
                      {isTog ? (sci ? "◱" : "◰") : label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}