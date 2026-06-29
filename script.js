document.addEventListener('DOMContentLoaded', () => {
    // --- 新增：初始化 Supabase 客戶端 ---
    const SUPABASE_URL = 'https://gmvxtxbuttamttqztmif.supabase.co/rest/v1/';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtdnh0eGJ1dHRhbXR0cXp0bWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzMyNzAsImV4cCI6MjA5ODMwOTI3MH0.XIrhRTg-Y2iCeuvy3qVhYRijL6H8jj4VNlPmaFI1_6Y';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // ------------------------------------
    // 預設連假日期
    const holidays = [
        "2026-01-01", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", 
        "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", 
        "2026-02-28", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06", 
        "2026-06-19", "2026-06-20", "2026-06-21", "2026-09-25", "2026-09-26", "2026-09-27"
    ];

    let dateList = [];

    // 初始化日曆
    const fp = flatpickr("#visit-range", {
        mode: "range", enableTime: true, time_24hr: true, dateFormat: "Y-m-d H:i",
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const dateStr = dayElem.dateObj.toLocaleDateString('en-CA');
            if (holidays.includes(dateStr)) dayElem.classList.add("is-holiday");
        }
    });

    // 週末選項顯示/隱藏自訂時間
    document.getElementById('weekend-check').addEventListener('change', function() {
        document.getElementById('weekend-times-container').style.display = this.checked ? 'block' : 'none';
    });

    // 新增區間與頻率
    document.getElementById('add-date-btn').addEventListener('click', () => {
        const dates = fp.selectedDates;
        if (dates.length !== 2) return alert("請在日曆中點選「抵達」與「離開」的完整時間！");
        
        const hours = (dates[1] - dates[0]) / (1000 * 60 * 60);
        if (hours <= 0) return alert("離開時間必須大於抵達時間！");

        const repeatType = document.getElementById('repeat-type').value;
        let repeatLabel = "單次";
        let annualMultiplier = 0;

        if (repeatType === "yearly") { repeatLabel = "每年"; annualMultiplier = 1; }
        else if (repeatType === "monthly") { repeatLabel = "每月"; annualMultiplier = 12; }
        else if (repeatType === "weekly") { repeatLabel = "每週"; annualMultiplier = 52; }

        const id = Date.now().toString();
        const startStr = formatDate(dates[0]);
        const endStr = formatDate(dates[1]);

        dateList.push({ id, hours, startStr, endStr, repeatLabel, annualMultiplier });
        renderTags();
        fp.clear();
    });

    // 格式化日期字串
    function formatDate(dateObj) {
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const h = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        return `${m}/${d} ${h}:${min}`;
    }

    // 渲染已選擇的標籤
    function renderTags() {
        const container = document.getElementById('date-list');
        container.innerHTML = '';
        if(dateList.length === 0) {
            container.innerHTML = '<span style="color:#aaa; font-size:14px;">尚未新增任何連假</span>';
            return;
        }
        dateList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'date-chip';
            div.innerHTML = `
                <span class="chip-info"><b>[${item.repeatLabel}]</b> ${item.startStr} ~ ${item.endStr} <span class="chip-hours">(${item.hours.toFixed(1)}h)</span></span>
                <button type="button" onclick="removeDate('${item.id}')">✕</button>
            `;
            container.appendChild(div);
        });
    }

    window.removeDate = function(id) {
        dateList = dateList.filter(item => item.id !== id);
        renderTags();
    };
    renderTags();

    let totalLifetimeHours = 0;
    let totalLifetimeDays = 0;
    let totalLifetimeTimes = 0;
    let hasClickedSurprise = false;

    // 核心計算邏輯
    document.getElementById('calc-btn').addEventListener('click', () => {
        const name = document.getElementById('person-name').value;
        const currentAge = parseInt(document.getElementById('current-age').value);
        const lifeExpectancy = parseInt(document.getElementById('life-expectancy').value);
        const includeWeekend = document.getElementById('weekend-check').checked;

        if (!name || isNaN(currentAge) || isNaN(lifeExpectancy)) return alert("請填寫基本資料！");
        if (currentAge >= lifeExpectancy) return alert("預估壽命需大於目前年齡喔！");
        if (dateList.length === 0 && !includeWeekend) return alert("請至少新增一個區間，或是勾選週末返鄉！");

        const remainingYears = lifeExpectancy - currentAge;
        
        totalLifetimeHours = 0;
        totalLifetimeTimes = 0;

        // 計算區間清單
        dateList.forEach(item => {
            if (item.annualMultiplier === 0) { // 單次
                totalLifetimeHours += item.hours;
                totalLifetimeTimes += 1;
            } else { // 每年/每月/每週
                totalLifetimeHours += item.hours * item.annualMultiplier * remainingYears;
                totalLifetimeTimes += item.annualMultiplier * remainingYears;
            }
        });

        // 計算週末自訂時間
        if (includeWeekend) {
            const startVal = document.getElementById('weekend-start').value.split(':');
            const endVal = document.getElementById('weekend-end').value.split(':');
            
            const startDate = new Date(2000, 0, 1, parseInt(startVal[0]), parseInt(startVal[1]));
            let endDate = new Date(2000, 0, 2, parseInt(endVal[0]), parseInt(endVal[1]));
            
            if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);

            const weekendHours = (endDate - startDate) / (1000 * 60 * 60);
            
            if (weekendHours > 0) {
                totalLifetimeHours += Math.floor(weekendHours * 52 * remainingYears);
                totalLifetimeTimes += 52 * remainingYears;
            }
        }

        totalLifetimeDays = Math.floor(totalLifetimeHours / 24);
        hasClickedSurprise = false;

        // 更新結果畫面
        document.getElementById('display-name').textContent = name;
        document.getElementById('surprise-btn').style.display = "block";
        document.getElementById('encouragement-text').innerHTML = "每一次相聚，都在倒數。<br>別讓等待，成為遺憾。";
        
        document.getElementById('input-section').classList.remove('active');
        document.getElementById('input-section').classList.add('hidden');
        
        setTimeout(() => {
            document.getElementById('result-section').classList.remove('hidden');
            document.getElementById('result-section').classList.add('active');
            animateValue("remaining-hours", 0, totalLifetimeHours, 2000);
            animateValue("remaining-days", 0, totalLifetimeDays, 2000);
            animateValue("remaining-times", 0, totalLifetimeTimes, 2000);
        }, 300);
    });

    // 數字跳動動畫
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            obj.innerHTML = Math.floor(easeOutProgress * (end - start) + start).toLocaleString();
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    // +24 小時驚喜按鈕
    document.getElementById('surprise-btn').addEventListener('click', () => {
        if (hasClickedSurprise) return;
        hasClickedSurprise = true;

        const prevHours = totalLifetimeHours;
        const prevDays = totalLifetimeDays;
        const prevTimes = totalLifetimeTimes;

        totalLifetimeHours += 24;
        totalLifetimeDays += 1;
        totalLifetimeTimes += 1;

        animateValue("remaining-hours", prevHours, totalLifetimeHours, 800);
        animateValue("remaining-days", prevDays, totalLifetimeDays, 800);
        animateValue("remaining-times", prevTimes, totalLifetimeTimes, 800);

        const anim = document.getElementById('plus-one-anim');
        anim.classList.remove('hidden');
        anim.classList.add('float-up');
        setTimeout(() => { anim.classList.remove('float-up'); anim.classList.add('hidden'); }, 1000);

        const enc = document.getElementById('encouragement-text');
        enc.style.opacity = 0;
        setTimeout(() => {
            enc.innerHTML = "太棒了！行動永遠不嫌晚。<br>你剛剛為你們的生命，多創造了一天的回憶。";
            enc.style.opacity = 1;
        }, 500);

        const btn = document.getElementById('surprise-btn');
        btn.style.opacity = 0;
        setTimeout(() => { btn.style.display = "none"; btn.style.opacity = 1; }, 500);
    });

    // 重新計算按鈕
    document.getElementById('reset-btn').addEventListener('click', () => {
        document.getElementById('result-section').classList.remove('active');
        document.getElementById('result-section').classList.add('hidden');
        setTimeout(() => {
            document.getElementById('input-section').classList.remove('hidden');
            document.getElementById('input-section').classList.add('active');
        }, 300);
    });
});
