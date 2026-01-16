const tools = {
    calculatorEnabled: false,
    calendarNotifsEnabled: false,
    currentDate: new Date(),

    init() {
        const savedCalc = localStorage.getItem('udt_tool_calc');
        const savedCal = localStorage.getItem('udt_tool_cal');

        if (savedCalc === 'true') {
            this.calculatorEnabled = true;
            document.getElementById('tool-calc-toggle').checked = true;
            this.showCalculator(true);
        }

        if (savedCal === 'true') {
            this.calendarNotifsEnabled = true;
            document.getElementById('tool-cal-toggle').checked = true;
            this.toggleHeaderCalendar(true);
            this.checkCalendarNotifs();
        }
    },

    // --- UTILITIES ---
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },

    toggleCalculator() {
        this.calculatorEnabled = !this.calculatorEnabled;
        localStorage.setItem('udt_tool_calc', this.calculatorEnabled);

        // Update Checkbox UI if it exists
        const toggle = document.getElementById('tool-calc-toggle');
        if (toggle) toggle.checked = this.calculatorEnabled;

        this.showCalculator(this.calculatorEnabled);
    },

    toggleCalendarNotifs() {
        this.calendarNotifsEnabled = !this.calendarNotifsEnabled;
        localStorage.setItem('udt_tool_cal', this.calendarNotifsEnabled);
        this.toggleHeaderCalendar(this.calendarNotifsEnabled);
        if (this.calendarNotifsEnabled) this.checkCalendarNotifs();
    },

    toggleHeaderCalendar(show) {
        const btn = document.getElementById('header-cal-btn');
        if (btn) btn.style.display = show ? 'block' : 'none';
    },

    toggleSciMode() {
        const widget = document.getElementById('calculator-widget');
        const sciKeys = document.getElementById('calc-sci-keys');
        if (widget && sciKeys) {
            widget.classList.toggle('expanded');
            const isExpanded = widget.classList.contains('expanded');
            sciKeys.style.display = isExpanded ? 'grid' : 'none';
        }
    },

    resetIdle() {
        const widget = document.getElementById('calculator-widget');
        if (widget) {
            widget.classList.remove('docked');
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                if (widget.style.display !== 'none') {
                    widget.classList.add('docked');
                }
            }, 10000); // 10 seconds auto-dock logic
        }
    },

    showCalculator(show) {
        const el = document.getElementById('calculator-widget');
        if (el) {
            el.style.display = show ? 'block' : 'none';
            if (show) {
                // Initialize Draggable Logic
                this.dragElement(el);
            }
        }
    },

    // --- DRAGGABLE LOGIC ---
    dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "-header")) {
            // if present, the header is where you move the DIV from:
            document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
            document.getElementById(elmnt.id + "-header").ontouchstart = dragMouseDown; // Mobile Touch
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
            elmnt.ontouchstart = dragMouseDown; // Mobile Touch
        }

        function dragMouseDown(e) {
            e = e || window.event;
            // Get the mouse cursor position at startup:
            if (e.type === 'touchstart') {
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
            } else {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
            }

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            // Mobile Events
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                e.preventDefault();
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // calculate the new cursor position:
            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            elmnt.style.right = 'auto';
            elmnt.style.bottom = 'auto';
            // Disable 'transform' if it interferes (center alignment)
            elmnt.style.transform = 'none';
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    },

    /* --- CALENDAR LOGIC --- */
    openCalendar() {
        document.getElementById('calendar-modal').style.display = 'flex';
        this.renderCalendar(this.currentDate);
    },

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar(this.currentDate);
    },

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar(this.currentDate);
    },

    renderCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        document.getElementById('cal-month-year').innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = document.getElementById('cal-days');
        grid.innerHTML = '';

        // Fetch "booked" transactions for this month
        const events = this.getEventsForMonth(year, month);

        // Blank cells before first day
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += '<div></div>';
        }

        const today = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = d;

            // Check for today
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            // Check for events
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (events[dateStr]) {
                dayDiv.classList.add('has-event');
                dayDiv.onclick = () => this.showEventDetails(dateStr, events[dateStr]);
            }

            grid.appendChild(dayDiv);
        }

        document.getElementById('cal-event-detail').style.display = 'none';
    },

    getEventsForMonth(year, month) {
        const txs = state.getTransactions();
        const eventMap = {};

        txs.forEach(t => {
            if (t.status === 'booked' && t.promiseDate) {
                const d = new Date(t.promiseDate);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    if (!eventMap[t.promiseDate]) eventMap[t.promiseDate] = [];
                    eventMap[t.promiseDate].push(t);
                }
            }
        });
        return eventMap;
    },

    showEventDetails(dateStr, events) {
        const box = document.getElementById('cal-event-detail');
        box.style.display = 'block';
        box.innerHTML = `<strong>Work Due on ${dateStr}:</strong><br>`;

        events.forEach(t => {
            box.innerHTML += `
                <div style="margin-top:5px; border-bottom:1px solid #eee; padding-bottom:3px;">
                    • ${t.name} - ${t.product} (${t.qty})<br>
                    <span style="color:#dc2626; font-size:0.8rem;">Due: ₹${(Number(t.amount) || 0) - (Number(t.paidAmount) || 0)}</span>
                </div>
            `;
        });
    },

    checkCalendarNotifs() {
        const todayStr = new Date().toISOString().split('T')[0];
        const pending = state.getTransactions().filter(t => t.status === 'booked' && t.promiseDate === todayStr);
        if (pending.length > 0) {
            showToast(`Task Alert: ${pending.length} settlement(s) due today!`, 'warning');

            // Add red dot to calendar icon
            const btn = document.getElementById('header-cal-btn');
            if (btn && !document.getElementById('cal-dot')) {
                const dot = document.createElement('div');
                dot.id = 'cal-dot';
                dot.style.cssText = "position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:red; border-radius:50%; border:2px solid white;";
                btn.appendChild(dot);
            }
        }
    }
};

const calc = {
    display: document.getElementById('calc-current'),
    history: document.getElementById('calc-history'),
    expression: '', // Full expression string to evaluate
    historyLog: [],
    memory: 0,
    justCalculated: false,

    // Append number or operator to expression
    input(val) {
        // If we just calculated (result is showing), and user types a number, clear first.
        // If they type an operator, continue with previous result.
        if (this.justCalculated) {
            if (!isNaN(val) || val === '.') {
                this.expression = '';
                this.updateDisplay('0');
            } else if (val === '(' || val === ')') {
                // allow parens to start new
                this.expression = '';
                this.updateDisplay('0');
            }
            this.justCalculated = false;
        }

        // Prevent multiple dots
        if (val === '.') {
            const parts = this.expression.split(/[\+\-\*\/%\(\)]/);
            const currentNum = parts[parts.length - 1];
            if (currentNum.includes('.')) return;
        }

        this.expression += val;
        this.updateDisplay(this.expression);
    },

    // Handle scientific functions
    func(name) {
        if (this.justCalculated) {
            this.justCalculated = false; // Continue operating on result
        }

        let op = '';
        switch (name) {
            case 'sin': op = 'Math.sin('; break;
            case 'cos': op = 'Math.cos('; break;
            case 'tan': op = 'Math.tan('; break;
            case 'log': op = 'Math.log10('; break;
            case 'ln': op = 'Math.log('; break;
            case 'sqrt': op = 'Math.sqrt('; break;
            case 'abs': op = 'Math.abs('; break;
            case 'pow':
                this.input('**'); // JS power operator
                return;
            default: return;
        }

        this.expression += op;
        this.updateDisplay(this.expression);
    },

    // Special operations
    clear() {
        this.expression = '';
        this.updateDisplay('0');
        this.historyLog = [];
        this.updateHistory('');
    },

    backspace() {
        this.expression = this.expression.toString().slice(0, -1);
        this.updateDisplay(this.expression || '0');
    },

    calculate() {
        if (!this.expression) return;
        try {
            // Replace visual operators with JS operators if needed (e.g. x -> *)
            // Although we are passing standard JS ops in this design
            let evalStr = this.expression;

            // Safety check: only allow numbers, math chars, and Math. prefix
            if (/[^0-9\+\-\*\/\.\%\(\)\sMath\.a-z\,]/.test(evalStr)) {
                // throw new Error("Invalid Input");
            }

            const result = new Function('return ' + evalStr)();

            // Format output (limit decimals)
            let finalRes = result;
            if (!Number.isInteger(result)) {
                finalRes = parseFloat(result.toFixed(8)); // avoid float precision errors
            }

            this.updateHistory(this.expression + ' =');
            this.expression = finalRes.toString();
            this.updateDisplay(this.expression);
            this.justCalculated = true;
        } catch (e) {
            this.updateDisplay("Error");
            this.expression = '';
        }
    },

    updateDisplay(val) {
        const disp = document.getElementById('calc-current');
        if (disp) disp.innerText = val || '0';
    },

    updateHistory(val) {
        const hist = document.getElementById('calc-history');
        if (hist) hist.innerText = val;
    },

    // --- MEMORY FUNCTIONS ---
    memoryClear() {
        this.memory = 0;
        showToast("Memory Cleared");
    },

    memoryRecall() {
        if (this.justCalculated) {
            this.expression = '';
            this.justCalculated = false;
        }
        this.expression += this.memory;
        this.updateDisplay(this.expression);
    },

    memoryAdd() {
        this.calculate(); // Ensure we have a result first
        if (!isNaN(parseFloat(this.expression))) {
            this.memory += parseFloat(this.expression);
            showToast("M+ Saved");
        }
    },

    memorySub() {
        this.calculate();
        if (!isNaN(parseFloat(this.expression))) {
            this.memory -= parseFloat(this.expression);
            showToast("M- Saved");
        }
    }
};

// Initialize tools on load
document.addEventListener('DOMContentLoaded', () => {
    tools.init();

    // Add listeners to wake/keep awake calculator
    const widget = document.getElementById('calculator-widget');
    if (widget) {
        // Reset idle on any interaction
        widget.addEventListener('mouseenter', () => tools.resetIdle());
        widget.addEventListener('mousemove', () => tools.resetIdle());
        widget.addEventListener('click', () => tools.resetIdle());
    }
});
