document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // Shared helpers
  // =========================
  const API_BASE = "https://jagtrading.xyz/api"; // same-domain: https://jagtrading.xyz/api/...

  // =========================
  // Login (index.html) placeholder
  // =========================
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Login is a placeholder for now. Next step is wiring this to the Flask API.");
    });
  }

  // role pill auto text (optional)
  const rolePill = document.getElementById("rolePill");
  if (rolePill) {
    const role = document.body?.dataset?.role;
    if (role === "admin") rolePill.textContent = "Admin";
    if (role === "customer") rolePill.textContent = "Customer";
    if (!role) rolePill.textContent = rolePill.textContent || "Guest";
  }

  // =========================
  // Market page (market.html)
  // =========================
  const marketTableBody = document.getElementById("marketTableBody");
  const refreshMarketBtn = document.getElementById("refreshMarketBtn");
  const marketSearch = document.getElementById("marketSearch");
  const marketUpdatedAt = document.getElementById("marketUpdatedAt");
  const marketStatusBadge = document.getElementById("marketStatusBadge");

  if (marketTableBody) {
    const money = (n) =>
      Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
    const num = (n) => Number(n || 0);
    const cap = (vol, price) => num(vol) * num(price);

    let allRows = [];

    const demoRows = [
      { ticker: "AAPL", company: "Apple", curr_price: 190.22, volume: 10000, open_price: 189.10, high: 191.35, low: 188.72 },
      { ticker: "AMD", company: "AMD", curr_price: 162.40, volume: 9000, open_price: 160.20, high: 163.10, low: 159.88 },
      { ticker: "INTC", company: "Intel", curr_price: 44.12, volume: 15000, open_price: 44.00, high: 44.60, low: 43.70 },
    ];

    const render = (rows) => {
      marketTableBody.innerHTML = "";
      rows.forEach((r) => {
        const t = String(r.ticker || "").toUpperCase();
        const company = r.company || r.company_name || "—";
        const price = r.curr_price ?? r.price ?? r.current_price ?? 0;
        const vol = r.volume ?? r.total_volume ?? 0;

        const open = r.open_price ?? price;
        const high = r.high ?? price;
        const low = r.low ?? price;

        const tr = document.createElement("tr");
        tr.className = "row-click";
        tr.dataset.ticker = t;

        tr.innerHTML = `
          <td class="mono">${t}</td>
          <td>${company}</td>
          <td>${money(price)}</td>
          <td>${num(vol).toLocaleString()}</td>
          <td>${money(cap(vol, price))}</td>
          <td>${money(open)}</td>
          <td>${money(high)}</td>
          <td>${money(low)}</td>
        `;
        marketTableBody.appendChild(tr);
      });
    };

    const applyFilter = () => {
      const q = (marketSearch?.value || "").trim().toLowerCase();
      if (!q) return render(allRows);
      const filtered = allRows.filter((r) => {
        const t = String(r.ticker || "").toLowerCase();
        const c = String(r.company || r.company_name || "").toLowerCase();
        return t.includes(q) || c.includes(q);
      });
      render(filtered);
    };

    const setUpdated = () => {
      const now = new Date();
      if (marketUpdatedAt) marketUpdatedAt.textContent = "last updated: " + now.toLocaleString();
    };

    const setStatus = (ok) => {
      if (!marketStatusBadge) return;
      marketStatusBadge.textContent = ok ? "status: live" : "status: demo";
      marketStatusBadge.className = ok ? "badge badge-good" : "badge";
    };

    const loadMarket = async () => {
      try {
        const res = await fetch(`${API_BASE}/list_prices`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();

        allRows = Array.isArray(data) ? data : (data.stocks || []);
        if (!allRows.length) throw new Error("empty");

        setStatus(true);
        setUpdated();
        applyFilter();
      } catch (e) {
        allRows = demoRows;
        setStatus(false);
        setUpdated();
        applyFilter();
      }
    };

    if (refreshMarketBtn) refreshMarketBtn.addEventListener("click", loadMarket);
    if (marketSearch) marketSearch.addEventListener("input", applyFilter);

    marketTableBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr.row-click");
      if (!tr) return;
      const t = tr.dataset.ticker;
      window.location.href = `trade-ticket.html?ticker=${encodeURIComponent(t)}`;
    });

    loadMarket();
  }

  // =========================
  // Admin Stocks page (admin-stocks.html) - still demo for now
  // =========================
  const stockTableBody = document.getElementById("stockTableBody");
  const newStockBtn = document.getElementById("newStockBtn");
  const stockFormCard = document.getElementById("stockFormCard");
  const stockForm = document.getElementById("stockForm");

  if (stockTableBody && newStockBtn && stockFormCard && stockForm) {
    const formTitle = document.getElementById("formTitle");
    const editIndex = document.getElementById("editIndex");
    const companyName = document.getElementById("companyName");
    const ticker = document.getElementById("ticker");
    const volume = document.getElementById("volume");
    const initPrice = document.getElementById("initPrice");
    const capPreview = document.getElementById("capPreview");
    const cancelStockBtn = document.getElementById("cancelStockBtn");

    let stocks = [
      { ticker: "AAPL", company: "Apple", initPrice: 190, volume: 10000 },
      { ticker: "MSFT", company: "Microsoft", initPrice: 410, volume: 5000 },
      { ticker: "TSLA", company: "Tesla", initPrice: 243, volume: 8000 },
    ];

    const money = (n) =>
      Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
    const cap = (vol, price) => Number(vol || 0) * Number(price || 0);

    const render = () => {
      stockTableBody.innerHTML = "";
      stocks.forEach((s, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${String(s.ticker).toUpperCase()}</td>
          <td>${s.company}</td>
          <td>${money(s.initPrice)}</td>
          <td>${Number(s.volume).toLocaleString()}</td>
          <td>${money(cap(s.volume, s.initPrice))}</td>
          <td>
            <button class="btn btn-ghost" type="button" data-action="edit" data-index="${i}">Edit</button>
          </td>
        `;
        stockTableBody.appendChild(tr);
      });
    };

    const openForm = (mode, index = "") => {
      stockFormCard.style.display = "block";
      if (mode === "new") {
        formTitle.textContent = "New Stock";
        editIndex.value = "";
        companyName.value = "";
        ticker.value = "";
        volume.value = "";
        initPrice.value = "";
        capPreview.textContent = money(0);
      } else {
        formTitle.textContent = "Edit Stock";
        editIndex.value = index;
        const s = stocks[index];
        companyName.value = s.company;
        ticker.value = s.ticker;
        volume.value = s.volume;
        initPrice.value = s.initPrice;
        capPreview.textContent = money(cap(s.volume, s.initPrice));
      }
      stockFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const closeForm = () => {
      stockFormCard.style.display = "none";
      editIndex.value = "";
    };

    const updateCapPreview = () => {
      capPreview.textContent = money(cap(volume.value, initPrice.value));
    };

    newStockBtn.addEventListener("click", () => openForm("new"));
    if (cancelStockBtn) cancelStockBtn.addEventListener("click", closeForm);
    volume.addEventListener("input", updateCapPreview);
    initPrice.addEventListener("input", updateCapPreview);

    stockTableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='edit']");
      if (!btn) return;
      openForm("edit", btn.dataset.index);
    });

    stockForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const payload = {
        company: companyName.value.trim(),
        ticker: ticker.value.trim().toUpperCase(),
        volume: Number(volume.value),
        initPrice: Number(initPrice.value),
      };

      if (!payload.company || !payload.ticker) return;

      const idx = editIndex.value;
      if (idx === "") {
        stocks.unshift(payload);
      } else {
        stocks[Number(idx)] = payload;
      }

      render();
      closeForm();
      alert("Saved stock (demo). Next step: wire to API.");
    });

    render();
  }

  // =========================
  // Admin Market page (admin-market.html) - WIRED TO API
  // =========================
  const marketHoursForm = document.getElementById("marketHoursForm");
  const holidayList = document.getElementById("holidayList");
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  const saveScheduleBtn = document.getElementById("saveScheduleBtn");

  if (marketHoursForm && holidayList && addHolidayBtn && saveScheduleBtn) {
    const openTimeInput = document.getElementById("openTime");
    const closeTimeInput = document.getElementById("closeTime");

    // NEW inputs you must add to admin-market.html
    const scheduleDateInput = document.getElementById("scheduleDate");
    const isMarketOpenInput = document.getElementById("isMarketOpen");
    const holidayNameInput = document.getElementById("holidayName");

    if (!scheduleDateInput || !isMarketOpenInput || !holidayNameInput) {
      alert("Admin Market page is missing schedule inputs (scheduleDate, isMarketOpen, holidayName). Add them to admin-market.html.");
      return;
    }

    let calendarRows = [];

    const getSchedule = async () => {
      const res = await fetch(`${API_BASE}/change_schedule`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load schedule");
      return await res.json();
    };

    const postSchedule = async (payload) => {
      const res = await fetch(`${API_BASE}/change_schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      try { return await res.json(); } catch { return null; }
    };

    const rowForDate = (dateStr) =>
      calendarRows.find((r) => String(r.date) === String(dateStr));

    const fillFromRow = (row) => {
      if (!row) return;

      openTimeInput.value = (row.open_time || "09:30").slice(0, 5);
      closeTimeInput.value = (row.close_time || "16:00").slice(0, 5);

      holidayNameInput.value = row.holiday_name || "";
      isMarketOpenInput.checked = Number(row.is_market_open) === 1;
    };

    const renderHolidayList = () => {
      holidayList.innerHTML = "";

      const holidays = calendarRows
        .filter((r) => Number(r.is_market_open) === 0 || String(r.holiday_name || "").trim() !== "")
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      if (!holidays.length) {
        holidayList.innerHTML = `<li class="holiday-item"><div class="holiday-name muted">No holiday closures found.</div></li>`;
        return;
      }

      holidays.forEach((r) => {
        const date = r.date;
        const name = (r.holiday_name || "Closed").trim();

        const li = document.createElement("li");
        li.className = "holiday-item";
        li.innerHTML = `
          <div class="holiday-name">
            <div class="mono">${date}</div>
            <div>${name}</div>
          </div>
          <div class="holiday-actions">
            <button class="btn btn-ghost btn-mini" type="button" data-action="edit" data-date="${date}">Edit</button>
            <button class="btn btn-ghost btn-mini" type="button" data-action="open" data-date="${date}">Re-open</button>
          </div>
        `;
        holidayList.appendChild(li);
      });
    };

    const refreshCalendar = async () => {
      calendarRows = await getSchedule();
      renderHolidayList();

      if (scheduleDateInput.value) {
        const row = rowForDate(scheduleDateInput.value);
        if (row) fillFromRow(row);
      }
    };

    // default date = today
    if (!scheduleDateInput.value) {
      scheduleDateInput.value = new Date().toISOString().slice(0, 10);
    }

    scheduleDateInput.addEventListener("change", () => {
      const row = rowForDate(scheduleDateInput.value);
      if (row) fillFromRow(row);
    });

    // Save hours (updates that selected date)
    marketHoursForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!scheduleDateInput.value) {
        alert("Pick a date first.");
        return;
      }

      const payload = {
        date: scheduleDateInput.value,
        is_market_open: isMarketOpenInput.checked ? 1 : 0,
        holiday_name: holidayNameInput.value.trim(),
        open_time: openTimeInput.value,
        close_time: closeTimeInput.value,
      };

      try {
        await postSchedule(payload);
        alert("Saved hours for that date.");
        await refreshCalendar();
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    });

    // Add holiday for the selected date (sets market closed)
    addHolidayBtn.addEventListener("click", async () => {
      const date = scheduleDateInput.value || prompt("Holiday date (YYYY-MM-DD):");
      if (!date) return;

      const name = holidayNameInput.value.trim() || prompt("Holiday name (example: Thanksgiving):");
      if (!name) return;

      const payload = {
        date,
        is_market_open: 0,
        holiday_name: name.trim(),
        open_time: openTimeInput.value || "09:30",
        close_time: closeTimeInput.value || "16:00",
      };

      try {
        await postSchedule(payload);
        await refreshCalendar();
      } catch (err) {
        alert("Add holiday failed: " + err.message);
      }
    });

    // Save schedule button = same as saving for selected date
    saveScheduleBtn.addEventListener("click", async () => {
      if (!scheduleDateInput.value) {
        alert("Pick a date first.");
        return;
      }

      const payload = {
        date: scheduleDateInput.value,
        is_market_open: isMarketOpenInput.checked ? 1 : 0,
        holiday_name: holidayNameInput.value.trim(),
        open_time: openTimeInput.value,
        close_time: closeTimeInput.value,
      };

      try {
        await postSchedule(payload);
        alert("Saved schedule for that date.");
        await refreshCalendar();
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    });

    // Holiday list actions
    holidayList.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const date = btn.dataset.date;

      if (action === "edit") {
        scheduleDateInput.value = date;
        const row = rowForDate(date);
        if (row) fillFromRow(row);
        return;
      }

      if (action === "open") {
        try {
          const row = rowForDate(date);
          await postSchedule({
            date,
            is_market_open: 1,
            holiday_name: "",
            open_time: (row?.open_time || openTimeInput.value || "09:30").slice(0, 5),
            close_time: (row?.close_time || closeTimeInput.value || "16:00").slice(0, 5),
          });
          await refreshCalendar();
        } catch (err) {
          alert("Re-open failed: " + err.message);
        }
      }
    });

    // initial load
    refreshCalendar();
  }

  // =========================
  // NOTE:
  // Your other pages (trade-ticket, open-orders, portfolio, history)
  // can be pasted below this and will now work correctly because we
  // do NOT close DOMContentLoaded early anymore.
  // =========================
});
