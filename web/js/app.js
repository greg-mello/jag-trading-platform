document.addEventListener("DOMContentLoaded", async () => {
  const REMOTE_API = "https://jagtrading.xyz/api";

  const API_BASE = (() => {
    const proto = window.location.protocol;
    if (proto === "http:" || proto === "https:") {
      const host = (window.location.hostname || "").toLowerCase();
      if (host === "100.72.22.18" || host.endsWith("jagtrading.xyz")) return "/api";
    }
    return REMOTE_API;
  })();

  const LOGOUT_ENDPOINT = `${API_BASE}/logout`;
  const DEPOSIT_ENDPOINT = `${API_BASE}/deposit`;
  const WITHDRAW_ENDPOINT = `${API_BASE}/withdraw`;
  const BUY_ORDER_ENDPOINT = `${API_BASE}/buy`;
  const SELL_ORDER_ENDPOINT = `${API_BASE}/sell`;
  const CANCEL_ORDER_ENDPOINT = `${API_BASE}/cancel_order`;
  const PORTFOLIO_ENDPOINT = `${API_BASE}/portfolio`;
  const TRANSACTION_HISTORY_ENDPOINT = `${API_BASE}/transaction_history`;
  const CHECK_ROLE_ENDPOINT = `${API_BASE}/check_role`;
  const MARKET_LIST_ENDPOINTS = [`${API_BASE}/list_prices`];

  const STORAGE_KEYS = {
    cashBalance: "trading_cash_balance",
    activity: "trading_activity_feed",
    transactions: "trading_transaction_feed",
  };

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.error ||
        data?.details ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  };

  const fetchFirstJson = async (urls, options = {}) => {
    let lastErr = null;
    for (const url of urls) {
      try {
        return await fetchJson(url, options);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("No endpoint available.");
  };

  const readStore = (key, fallback) => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeStore = (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const getStoredCashBalance = () => {
    const n = Number(readStore(STORAGE_KEYS.cashBalance, null));
    return Number.isFinite(n) ? n : null;
  };

  const setStoredCashBalance = (value) => {
    const n = Number(value);
    if (Number.isFinite(n)) writeStore(STORAGE_KEYS.cashBalance, n);
  };

  const recordActivity = (item) => {
    const items = readStore(STORAGE_KEYS.activity, []);
    items.push(item);
    writeStore(STORAGE_KEYS.activity, items.slice(-50));
  };

  const recordTransaction = (item) => {
    const items = readStore(STORAGE_KEYS.transactions, []);
    items.push(item);
    writeStore(STORAGE_KEYS.transactions, items.slice(-100));
  };

  const normalizeStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "cancelled") return "canceled";
    return s;
  };

const extractBalance = (data) => {
  const candidates = [
    data?.avail_balance,
    data?.available_balance,
    data?.balance,
    data?.new_balance,
    data?.updated_balance,
    data?.cash_balance,
    data?.cash,
    data?.cashBalance,
    data?.account_balance,
    data?.account?.avail_balance,
    data?.account?.available_balance,
    data?.account?.balance,
    data?.account?.cash_balance,
    data?.account?.cash,
    data?.account?.cashBalance,
    data?.account?.account_balance,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return null;
};

  const mapRemoteHolding = (item) => ({
    holdings_id: item?.holdings_id ?? null,
    stock_id: item?.stock_id ?? null,
    ticker: item?.ticker || "",
    company: item?.company || "",
    shares: Number(item?.shares_owned || 0),
    price: Number(item?.curr_price || 0),
    total_value: Number(item?.total_value || 0),
  });

  const mapRemoteTransaction = (item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.price_at_order || 0);

    return {
      order_id: item?.order_id ?? null,
      stock_id: item?.stock_id ?? null,
      dt: item?.timestamp ? String(item.timestamp).replace(" ", "T") : new Date().toISOString(),
      type: String(item?.order_type || "").toLowerCase(),
      ticker: item?.ticker || "-",
      company: item?.company || "",
      shares: quantity,
      price,
      total: Number((quantity * price).toFixed(2)),
      status: normalizeStatus(item?.status),
      notes: item?.company || "",
    };
  };

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

  const num = (n) => Number(n || 0);

  const pickInput = (...keys) => {
    for (const key of keys) {
      const byId = document.getElementById(key);
      if (byId) return byId;

      const byName = document.querySelector(`[name="${key}"]`);
      if (byName) return byName;
    }
    return null;
  };

  const normalizeRole = (value) => {
    if (typeof value === "string") return value.trim().toLowerCase();

    return String(
      value?.role ||
      value?.user?.role ||
      value?.session?.role ||
      value?.user_role ||
      ""
    ).trim().toLowerCase();
  };

  const redirectByRole = (role) => {
    if (String(role || "").toLowerCase() === "admin") {
      window.location.href = "admin-stocks.html";
      return;
    }
    window.location.href = "portfolio-cash.html";
  };

  const getCurrentRole = async () => {
    try {
      const data = await fetchJson(CHECK_ROLE_ENDPOINT, { method: "GET" });
      const role = normalizeRole(data);
      return role || "guest";
    } catch {
      return "guest";
    }
  };

  const findNavLink = (idList = [], hrefList = []) => {
    for (const id of idList) {
      const el = document.getElementById(id);
      if (el) return el;
    }

    for (const href of hrefList) {
      const el = document.querySelector(`a[href="${href}"]`) || document.querySelector(`a[href$="${href}"]`);
      if (el) return el;
    }

    return null;
  };

  const updateNavbarByRole = (role) => {
    const adminStocksLink = findNavLink(
      ["adminStocksLink", "adminStocksTab"],
      ["admin-stocks.html", "/admin-stocks.html"]
    );

    const adminMarketLink = findNavLink(
      ["adminMarketLink", "adminMarketTab"],
      ["admin-market.html", "/admin-market.html"]
    );

    const logoutLink = findNavLink(
      ["logoutBtn", "logoutLink"],
      ["index.html", "/index.html"]
    );

    if (adminStocksLink) adminStocksLink.style.display = "none";
    if (adminMarketLink) adminMarketLink.style.display = "none";

    if (role === "admin") {
      if (adminStocksLink) adminStocksLink.style.display = "";
      if (adminMarketLink) adminMarketLink.style.display = "";
    }

    if (logoutLink) {
      logoutLink.style.display = role === "guest" ? "none" : "";
    }
  };

  const protectAdminPage = (role) => {
    const page = (window.location.pathname.split("/").pop() || "").toLowerCase();
    const isAdminPage = page === "admin-stocks.html" || page === "admin-market.html";

    if (!isAdminPage) return true;

    if (role !== "admin") {
      alert("Access denied. Admins only.");
      window.location.href = "market.html";
      return false;
    }

    return true;
  };

  const currentRole = await getCurrentRole();
  updateNavbarByRole(currentRole);

  if (!protectAdminPage(currentRole)) {
    return;
  }

  const rolePill = document.getElementById("rolePill");
  if (rolePill) {
    if (currentRole === "admin") rolePill.textContent = "Admin";
    else if (currentRole === "customer" || currentRole === "user") rolePill.textContent = "User";
    else rolePill.textContent = "Guest";
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetchJson(LOGOUT_ENDPOINT, { method: "POST" });
        alert("Logged out successfully.");
        window.location.href = "index.html";
      } catch (err) {
        alert("Logout failed: " + err.message);
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userNameEl = pickInput("loginInput", "user_name", "userName", "username", "email");
      const passwordEl = pickInput("password");

      const rawLogin = (userNameEl?.value || "").trim();
      const payload = {
        user_name: rawLogin.includes("@") ? rawLogin.split("@")[0].trim() : rawLogin,
        password: passwordEl?.value || "",
      };

      if (!payload.user_name || !payload.password) {
        alert("Please enter your username and password.");
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const data = await fetchJson(`${API_BASE}/login`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        alert("Login successful.");
        redirectByRole(normalizeRole(data) || "user");
      } catch (err) {
        alert("Login failed: " + err.message);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const createAccountForm = document.getElementById("createAccountForm");
  if (createAccountForm) {
    createAccountForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        first_name: (document.getElementById("firstName")?.value || "").trim(),
        last_name: (document.getElementById("lastName")?.value || "").trim(),
        user_name: (document.getElementById("userName")?.value || "").trim(),
        email_address: (document.getElementById("email")?.value || "").trim(),
        password: document.getElementById("password")?.value || "",
      };

      const confirmPassword = document.getElementById("confirmPassword")?.value || "";

      if (!payload.first_name || !payload.last_name || !payload.user_name || !payload.email_address || !payload.password) {
        alert("Please fill out all fields.");
        return;
      }

      if (payload.password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      const submitBtn = createAccountForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await fetchJson(`${API_BASE}/register`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        alert("Account created successfully. Please log in.");
        window.location.href = "index.html";
      } catch (err) {
        alert("Create account failed: " + err.message);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const marketTableBody = document.getElementById("marketTableBody");
  const refreshMarketBtn = document.getElementById("refreshMarketBtn");
  const marketSearch = document.getElementById("marketSearch");
  const marketUpdatedAt = document.getElementById("marketUpdatedAt");
  const marketStatusBadge = document.getElementById("marketStatusBadge");

  if (marketTableBody) {
    let allRows = [];

    const demoRows = [
      { stock_id: 1, ticker: "AAPL", company: "Apple", curr_price: 190.22, volume: 10000, market_cap: 1902200, open_price: 189.10, high: 191.35, low: 188.72 },
      { stock_id: 2, ticker: "AMD", company: "AMD", curr_price: 162.4, volume: 9000, market_cap: 1461600, open_price: 160.2, high: 163.1, low: 159.88 },
      { stock_id: 3, ticker: "INTC", company: "Intel", curr_price: 44.12, volume: 15000, market_cap: 661800, open_price: 44.0, high: 44.6, low: 43.7 },
    ];

    const render = (rows) => {
      marketTableBody.innerHTML = "";
      rows.forEach((r) => {
        const ticker = String(r.ticker || "").toUpperCase();
        const company = r.company || r.company_name || "—";
        const price = r.curr_price ?? r.price ?? r.current_price ?? 0;
        const volume = r.volume ?? r.total_volume ?? 0;
        const marketCap = r.market_cap ?? (num(volume) * num(price));
        const open = r.open_price ?? price;
        const high = r.high ?? price;
        const low = r.low ?? price;

        const tr = document.createElement("tr");
        tr.className = "row-click";
        tr.dataset.ticker = ticker;
        tr.innerHTML = `
          <td class="mono">${ticker}</td>
          <td>${company}</td>
          <td>${money(price)}</td>
          <td>${num(volume).toLocaleString()}</td>
          <td>${money(marketCap)}</td>
          <td>${money(open)}</td>
          <td>${money(high)}</td>
          <td>${money(low)}</td>
        `;
        marketTableBody.appendChild(tr);
      });
    };

    const applyFilter = () => {
      const q = (marketSearch?.value || "").trim().toLowerCase();
      if (!q) {
        render(allRows);
        return;
      }

      render(
        allRows.filter((r) => {
          const ticker = String(r.ticker || "").toLowerCase();
          const company = String(r.company || r.company_name || "").toLowerCase();
          return ticker.includes(q) || company.includes(q);
        })
      );
    };

    const setUpdated = () => {
      if (marketUpdatedAt) marketUpdatedAt.textContent = "last updated: " + new Date().toLocaleString();
    };

    const setStatus = (ok) => {
      if (!marketStatusBadge) return;
      marketStatusBadge.textContent = ok ? "status: live" : "status: demo";
      marketStatusBadge.className = ok ? "badge badge-good" : "badge";
    };

    const loadMarket = async () => {
      try {
        const data = await fetchFirstJson(MARKET_LIST_ENDPOINTS);
        allRows = Array.isArray(data) ? data : (data?.stocks || []);
        if (!allRows.length) throw new Error("empty");
        setStatus(true);
      } catch {
        allRows = demoRows;
        setStatus(false);
      }

      setUpdated();
      applyFilter();
    };

    if (refreshMarketBtn) refreshMarketBtn.addEventListener("click", loadMarket);
    if (marketSearch) marketSearch.addEventListener("input", applyFilter);

    marketTableBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr.row-click");
      if (!tr) return;
      window.location.href = `trade-ticket.html?ticker=${encodeURIComponent(tr.dataset.ticker)}`;
    });

    loadMarket();
  }

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

    let stocks = [];

    const renderStocks = () => {
      stockTableBody.innerHTML = "";

      if (!stocks.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="muted">No stocks found.</td>`;
        stockTableBody.appendChild(tr);
        return;
      }

      stocks.forEach((s, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${String(s.ticker).toUpperCase()}</td>
          <td>${s.company}</td>
          <td>${money(s.initPrice)}</td>
          <td>${Number(s.volume).toLocaleString()}</td>
          <td>${money(Number(s.volume || 0) * Number(s.initPrice || 0))}</td>
          <td><button class="btn btn-ghost" type="button" data-action="edit" data-index="${i}">Edit</button></td>
        `;
        stockTableBody.appendChild(tr);
      });
    };

    const loadStocks = async () => {
      try {
        const data = await fetchFirstJson(MARKET_LIST_ENDPOINTS);
        const rows = Array.isArray(data) ? data : (data?.stocks || []);

        stocks = rows.map((item) => ({
          ticker: item.ticker || "",
          company: item.company || item.company_name || "",
          initPrice: Number(item.init_price || item.price || 0),
          volume: Number(item.volume || 0),
        }));
      } catch (err) {
        console.error("Load stocks failed:", err);
        stocks = [];
      }

      renderStocks();
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
        capPreview.textContent = money(Number(s.volume || 0) * Number(s.initPrice || 0));
      }
      stockFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const closeForm = () => {
      stockFormCard.style.display = "none";
      editIndex.value = "";
    };

    const updateCapPreview = () => {
      capPreview.textContent = money(Number(volume.value || 0) * Number(initPrice.value || 0));
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

    stockForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        company: companyName.value.trim(),
        ticker: ticker.value.trim().toUpperCase(),
        init_price: Number(initPrice.value),
        volume: Number(volume.value),
      };

      if (!payload.company || !payload.ticker || !payload.init_price || !payload.volume) return;

      const idx = editIndex.value;

      if (idx === "") {
        try {
          await fetchJson(`${API_BASE}/add_stock`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

          await loadStocks();
          closeForm();
          alert("Stock added to database.");
        } catch (err) {
          alert("Add stock failed: " + err.message);
        }
        return;
      }

      stocks[Number(idx)] = {
        ticker: payload.ticker,
        company: payload.company,
        initPrice: payload.init_price,
        volume: payload.volume,
      };

      renderStocks();
      closeForm();
      alert("Edited stock in UI only (no DB update endpoint yet).");
    });

    loadStocks();
  }

  const marketHoursForm = document.getElementById("marketHoursForm");
  const holidayList = document.getElementById("holidayList");
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  const saveScheduleBtn = document.getElementById("saveScheduleBtn");

  if (marketHoursForm && holidayList && addHolidayBtn && saveScheduleBtn) {
    const openTimeInput = document.getElementById("openTime");
    const closeTimeInput = document.getElementById("closeTime");
    const scheduleDateInput = document.getElementById("scheduleDate");
    const isMarketOpenInput = document.getElementById("isMarketOpen");
    const holidayNameInput = document.getElementById("holidayName");

    if (!scheduleDateInput || !isMarketOpenInput || !holidayNameInput) {
      alert("Admin Market page is missing schedule inputs (scheduleDate, isMarketOpen, holidayName).");
      return;
    }

    let calendarRows = [];

    const isoDate = (d) => {
      try {
        return new Date(d).toISOString().slice(0, 10);
      } catch {
        return "";
      }
    };

    const timeHHMM = (t) => (t ? String(t).slice(0, 5) : "");

    const toTimeSec = (t) => {
      if (!t) return t;
      const s = String(t);
      return s.length === 5 ? `${s}:00` : s;
    };

    const cleanHolidayName = (name) => {
      const s = String(name || "").trim();
      if (!s || s.toLowerCase() === "n/a") return "";
      return s;
    };

    const isWeekendRow = (r) => String(r.day_type || "").toLowerCase() === "weekend";

    const dayTypeForDate = (dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      const dow = d.getDay();
      return dow === 0 || dow === 6 ? "Weekend" : "Weekday";
    };

    const getSchedule = async () => {
      const data = await fetchJson(`${API_BASE}/change_schedule`);
      const rows = Array.isArray(data) ? data : data?.schedule || data?.rows || [];
      return rows.map((r) => ({
        ...r,
        _iso: isoDate(r.date),
        open_time: timeHHMM(r.open_time),
        close_time: timeHHMM(r.close_time),
        holiday_name: cleanHolidayName(r.holiday_name),
      }));
    };

    const postSchedule = async (payload) => {
      const bodyObj = { ...payload };
      if (!bodyObj.day_type) bodyObj.day_type = dayTypeForDate(bodyObj.date);

      return await fetchJson(`${API_BASE}/change_schedule`, {
        method: "POST",
        body: JSON.stringify(bodyObj),
      });
    };

    const postHours = async (payload) =>
      fetchJson(`${API_BASE}/change_hours`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

    const rowForDate = (dateStr) =>
      calendarRows.find((r) => String(r._iso) === String(dateStr));

    const fillFromRow = (row) => {
      if (!row) return;
      openTimeInput.value = row.open_time || "09:30";
      closeTimeInput.value = row.close_time || "16:00";
      holidayNameInput.value = row.holiday_name || "";
      isMarketOpenInput.checked = Number(row.is_market_open) === 1;
    };

    const renderHolidayList = () => {
      holidayList.innerHTML = "";

      const holidays = calendarRows
        .filter((r) => {
          const closed = Number(r.is_market_open) === 0;
          const hasHolidayName = !!cleanHolidayName(r.holiday_name);
          return (closed && !isWeekendRow(r)) || hasHolidayName;
        })
        .sort((a, b) => String(a._iso).localeCompare(String(b._iso)));

      if (!holidays.length) {
        holidayList.innerHTML = `<li class="holiday-item"><div class="holiday-name muted">No holiday closures found.</div></li>`;
        return;
      }

      holidays.forEach((r) => {
        const date = r._iso;
        const name = cleanHolidayName(r.holiday_name) || "Closed";

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

    if (!scheduleDateInput.value) {
      scheduleDateInput.value = new Date().toISOString().slice(0, 10);
    }

    scheduleDateInput.addEventListener("change", () => {
      const row = rowForDate(scheduleDateInput.value);
      if (row) fillFromRow(row);
    });

    marketHoursForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!scheduleDateInput.value) {
        alert("Pick a date first.");
        return;
      }

      try {
        await postHours({
          date: scheduleDateInput.value,
          open_time: openTimeInput.value,
          close_time: closeTimeInput.value,
        });
        alert("Saved hours for that date.");
        await refreshCalendar();
      } catch (err) {
        alert("Save hours failed: " + err.message);
      }
    });

    addHolidayBtn.addEventListener("click", async () => {
      const date = scheduleDateInput.value || prompt("Holiday date (YYYY-MM-DD):");
      if (!date) return;

      const name = holidayNameInput.value.trim() || prompt("Holiday name (example: Thanksgiving):");
      if (!name) return;

      try {
        await postSchedule({
          date,
          is_market_open: 0,
          holiday_name: name.trim(),
          open_time: toTimeSec(openTimeInput.value || "09:30"),
          close_time: toTimeSec(closeTimeInput.value || "16:00"),
        });
        alert("Saved schedule for that date.");
        await refreshCalendar();
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    });

    saveScheduleBtn.addEventListener("click", async () => {
      if (!scheduleDateInput.value) {
        alert("Pick a date first.");
        return;
      }

      try {
        await postSchedule({
          date: scheduleDateInput.value,
          is_market_open: isMarketOpenInput.checked ? 1 : 0,
          holiday_name: holidayNameInput.value.trim(),
          open_time: toTimeSec(openTimeInput.value),
          close_time: toTimeSec(closeTimeInput.value),
        });
        alert("Saved schedule for that date.");
        await refreshCalendar();
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    });

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
            open_time: toTimeSec((row?.open_time || openTimeInput.value || "09:30").slice(0, 5)),
            close_time: toTimeSec((row?.close_time || closeTimeInput.value || "16:00").slice(0, 5)),
          });
          alert("Saved schedule for that date.");
          await refreshCalendar();
        } catch (err) {
          alert("Re-open failed: " + err.message);
        }
      }
    });

    refreshCalendar();
  }

  const tradeForm = document.getElementById("tradeForm");
  const tradeTicker = document.getElementById("tradeTicker");
  const tradeSide = document.getElementById("tradeSide");
  const tradeQty = document.getElementById("tradeQty");
  const tradePrice = document.getElementById("tradePrice");
  const tradeTotal = document.getElementById("tradeTotal");
  const tradeStatus = document.getElementById("tradeStatus");
  const cancelPreviewBtn = document.getElementById("cancelPreviewBtn");
  const fillFromMarketBtn = document.getElementById("fillFromMarketBtn");

  if (tradeForm && tradeTicker && tradeQty && tradePrice) {
    const $ = (id) => document.getElementById(id);

    const detailTicker = $("detailTicker");
    const detailPrice = $("detailPrice");
    const detailVolume = $("detailVolume");
    const detailCap = $("detailCap");
    const detailOpen = $("detailOpen");
    const detailHigh = $("detailHigh");
    const detailLow = $("detailLow");
    const detailUpdated = $("detailUpdated");

    const demoRows = [
      { stock_id: 1, ticker: "AAPL", company: "Apple", curr_price: 190.22, volume: 10000, market_cap: 1902200, open_price: 189.10, high: 191.35, low: 188.72 },
      { stock_id: 2, ticker: "AMD", company: "AMD", curr_price: 162.4, volume: 9000, market_cap: 1461600, open_price: 160.2, high: 163.1, low: 159.88 },
      { stock_id: 3, ticker: "INTC", company: "Intel", curr_price: 44.12, volume: 15000, market_cap: 661800, open_price: 44.0, high: 44.6, low: 43.7 },
    ];

    let marketCache = [];
    let selectedStock = null;

    const setTradeStatus = (msg) => {
      if (tradeStatus) tradeStatus.textContent = msg;
    };

    const setDetails = (row) => {
      selectedStock = row || null;
      const price = row?.curr_price ?? row?.price ?? row?.current_price ?? 0;
      const volume = row?.volume ?? row?.total_volume ?? 0;
      const open = row?.open_price ?? price;
      const high = row?.high ?? price;
      const low = row?.low ?? price;

      detailTicker.textContent = String(row?.ticker || "").toUpperCase() || "—";
      detailPrice.textContent = money(price);
      detailVolume.textContent = num(volume).toLocaleString();
      detailCap.textContent = money(row?.market_cap ?? (num(volume) * num(price)));
      detailOpen.textContent = money(open);
      detailHigh.textContent = money(high);
      detailLow.textContent = money(low);
      detailUpdated.textContent = new Date().toLocaleString();

      tradePrice.value = Number(price).toFixed(2);
      updateTotal();
    };

    const updateTotal = () => {
      const qty = num(tradeQty.value);
      const price = num(String(tradePrice.value || "").replace(/[^0-9.]/g, ""));
      if (!qty || !price) {
        tradeTotal.textContent = "—";
        return;
      }
      tradeTotal.textContent = money(qty * price);
    };

    const loadMarketCache = async () => {
      try {
        const data = await fetchFirstJson(MARKET_LIST_ENDPOINTS);
        marketCache = Array.isArray(data) ? data : data?.stocks || [];
        if (!marketCache.length) throw new Error("empty");
        return true;
      } catch {
        marketCache = demoRows;
        return false;
      }
    };

    const findTicker = (ticker) => {
      const t = String(ticker || "").toUpperCase();
      return marketCache.find((r) => String(r.ticker || "").toUpperCase() === t);
    };

    const hydrateFromQuery = async () => {
      const t = new URLSearchParams(window.location.search).get("ticker");
      if (!t) return;

      tradeTicker.value = String(t).toUpperCase();
      await loadMarketCache();
      const row = findTicker(tradeTicker.value);
      if (row) {
        setDetails(row);
        setTradeStatus("ready");
      }
    };

    const onTickerChange = async () => {
      const t = tradeTicker.value.trim().toUpperCase();
      if (!t) return;

      setTradeStatus("loading...");
      await loadMarketCache();
      const row = findTicker(t);

      if (row) {
        setDetails(row);
        setTradeStatus("ready");
      } else {
        selectedStock = null;
        tradePrice.value = "";
        tradeTotal.textContent = "—";
        detailTicker.textContent = t;
        detailPrice.textContent = "—";
        detailVolume.textContent = "—";
        detailCap.textContent = "—";
        detailOpen.textContent = "—";
        detailHigh.textContent = "—";
        detailLow.textContent = "—";
        detailUpdated.textContent = new Date().toLocaleString();
        setTradeStatus("ticker not found");
      }
    };

    const submitTrade = async () => {
      const side = String(tradeSide.value || "").toLowerCase();
      const qty = num(tradeQty.value);
      const price = num(String(tradePrice.value || "").replace(/[^0-9.]/g, ""));

      if (!selectedStock) throw new Error("Stock not found. Pick a valid ticker first.");

      const stockId = selectedStock.stock_id ?? selectedStock.id ?? selectedStock.stockId;
      if (!stockId) throw new Error("Missing stock_id for this ticker.");
      if (!qty || qty < 1) throw new Error("Enter a valid quantity.");
      if (!price || price <= 0) throw new Error("Enter a valid price.");

      const endpoint = side === "sell" ? SELL_ORDER_ENDPOINT : BUY_ORDER_ENDPOINT;

      return await fetchJson(endpoint, {
        method: "POST",
        body: JSON.stringify({
          stock_id: Number(stockId),
          quantity: Number(qty),
          price: Number(price),
        }),
      });
    };

    tradeQty.addEventListener("input", updateTotal);
    tradePrice.addEventListener("input", updateTotal);

    tradeTicker.addEventListener("input", () => {
      window.clearTimeout(window.__ttDebounce);
      window.__ttDebounce = window.setTimeout(onTickerChange, 350);
    });

    if (fillFromMarketBtn) fillFromMarketBtn.addEventListener("click", hydrateFromQuery);

    if (cancelPreviewBtn) {
      cancelPreviewBtn.addEventListener("click", () => {
        tradeForm.reset();
        selectedStock = null;
        tradePrice.value = "";
        tradeTotal.textContent = "—";
        setTradeStatus("ready");
        detailTicker.textContent = "—";
        detailPrice.textContent = "—";
        detailVolume.textContent = "—";
        detailCap.textContent = "—";
        detailOpen.textContent = "—";
        detailHigh.textContent = "—";
        detailLow.textContent = "—";
        detailUpdated.textContent = "—";
      });
    }

    tradeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = tradeForm.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        setTradeStatus("submitting...");
        const data = await submitTrade();

        const side = String(tradeSide.value || "").toUpperCase();
        const qty = num(tradeQty.value);
        const ticker = String(tradeTicker.value || "").toUpperCase();
        const tradePriceNum = num(String(tradePrice.value || "").replace(/[^0-9.]/g, ""));
        const total = qty * tradePriceNum;
        const status = normalizeStatus(data?.status || data?.order_status || (data?.pending ? "pending" : "completed"));

        recordActivity({
          type: side.toLowerCase(),
          amount: total,
          time: new Date().toLocaleString(),
          note: `${side} ${qty} ${ticker}`,
        });

        const returnedBalance = extractBalance(data);
        if (returnedBalance !== null) {
          setStoredCashBalance(returnedBalance);
        } else {
          const cachedCash = getStoredCashBalance();
          if (cachedCash !== null && status === "completed") {
            setStoredCashBalance(side === "BUY" ? cachedCash - total : cachedCash + total);
          }
        }

        alert(`${side} order submitted successfully for ${qty} shares of ${ticker}.`);
        console.log("Trade response:", data);
        setTradeStatus("submitted");
      } catch (err) {
        setTradeStatus("failed");
        alert("Trade failed: " + err.message);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    hydrateFromQuery();
  }

  const openOrdersBody = document.getElementById("openOrdersBody");
  const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
  const cancelSelectedBtn = document.getElementById("cancelSelectedBtn");
  const clearSelectedBtn = document.getElementById("clearSelectedBtn");

  if (openOrdersBody) {
    const odId = document.getElementById("od_id");
    const odTicker = document.getElementById("od_ticker");
    const odSide = document.getElementById("od_side");
    const odQty = document.getElementById("od_qty");
    const odType = document.getElementById("od_type");
    const odStatus = document.getElementById("od_status");
    const odTime = document.getElementById("od_time");

    let selectedOrder = null;
    let pendingOrders = [];

    const clearSelection = () => {
      selectedOrder = null;
      if (odId) odId.textContent = "—";
      if (odTicker) odTicker.textContent = "—";
      if (odSide) odSide.textContent = "—";
      if (odQty) odQty.textContent = "—";
      if (odType) odType.textContent = "—";
      if (odStatus) odStatus.textContent = "—";
      if (odTime) odTime.textContent = "—";
      if (cancelSelectedBtn) cancelSelectedBtn.disabled = true;

      openOrdersBody.querySelectorAll("tr").forEach((tr) => tr.classList.remove("is-selected"));
    };

    const fillSelection = (order) => {
      selectedOrder = order;
      if (odId) odId.textContent = order.order_id ?? "—";
      if (odTicker) odTicker.textContent = order.ticker ?? "—";
      if (odSide) odSide.textContent = String(order.type || "—").toUpperCase();
      if (odQty) odQty.textContent = order.shares ?? "—";
      if (odType) odType.textContent = "Limit";
      if (odStatus) odStatus.textContent = order.status ?? "—";
      if (odTime) odTime.textContent = order.dt ? new Date(order.dt).toLocaleString() : "—";
      if (cancelSelectedBtn) cancelSelectedBtn.disabled = !order.order_id;
    };

    const renderOpenOrders = () => {
      openOrdersBody.innerHTML = "";

      if (!pendingOrders.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8" class="muted">No pending orders.</td>`;
        openOrdersBody.appendChild(tr);
        clearSelection();
        return;
      }

      pendingOrders.forEach((order) => {
        const tr = document.createElement("tr");
        tr.dataset.orderId = String(order.order_id);

        tr.innerHTML = `
          <td class="mono">${order.order_id}</td>
          <td class="mono">${String(order.ticker || "—").toUpperCase()}</td>
          <td>${String(order.type || "—").toUpperCase()}</td>
          <td class="mono">${order.shares ?? "—"}</td>
          <td>Limit</td>
          <td>${order.status || "pending"}</td>
          <td class="mono">${order.dt ? new Date(order.dt).toLocaleString() : "—"}</td>
          <td><button class="btn btn-ghost btn-mini" type="button" data-action="select">Select</button></td>
        `;

        openOrdersBody.appendChild(tr);
      });

      if (selectedOrder?.order_id) {
        const refreshed = pendingOrders.find((item) => String(item.order_id) === String(selectedOrder.order_id));
        if (refreshed) {
          const row = openOrdersBody.querySelector(`tr[data-order-id="${CSS.escape(String(refreshed.order_id))}"]`);
          if (row) row.classList.add("is-selected");
          fillSelection(refreshed);
        } else {
          clearSelection();
        }
      }
    };

    const loadOpenOrders = async () => {
      try {
        const data = await fetchJson(TRANSACTION_HISTORY_ENDPOINT);
        const rows = Array.isArray(data) ? data : data?.transactions || [];
        pendingOrders = rows
          .map(mapRemoteTransaction)
          .filter((item) => normalizeStatus(item.status) === "pending");
      } catch {
        pendingOrders = [];
      }
      renderOpenOrders();
    };

    openOrdersBody.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-order-id]");
      if (!row) return;

      const order = pendingOrders.find((item) => String(item.order_id) === String(row.dataset.orderId));
      if (!order) return;

      openOrdersBody.querySelectorAll("tr").forEach((tr) => tr.classList.remove("is-selected"));
      row.classList.add("is-selected");
      fillSelection(order);
    });

    if (clearSelectedBtn) clearSelectedBtn.addEventListener("click", clearSelection);
    if (refreshOrdersBtn) refreshOrdersBtn.addEventListener("click", loadOpenOrders);

    if (cancelSelectedBtn) {
      cancelSelectedBtn.addEventListener("click", async () => {
        if (!selectedOrder?.order_id) return;

        try {
          await fetchJson(CANCEL_ORDER_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({ order_id: selectedOrder.order_id }),
          });
          alert("Order canceled.");
          clearSelection();
          await loadOpenOrders();
        } catch (err) {
          alert("Cancel order failed: " + err.message);
        }
      });
    }

    loadOpenOrders();
  }

  const holdingsBody = document.getElementById("holdingsBody");
  const refreshPortfolioBtn = document.getElementById("refreshPortfolioBtn");
  const cashForm = document.getElementById("cashForm");

  if (holdingsBody) {
    const cashBalanceEl = document.getElementById("cashBalance");
    const portfolioValueEl = document.getElementById("portfolioValue");
    const totalValueEl = document.getElementById("totalValue");
    const activityList = document.getElementById("activityList");
    const cashAction = document.getElementById("cashAction");
    const cashAmount = document.getElementById("cashAmount");
    const resetCashBtn = document.getElementById("resetCashBtn");

    let state = {
      cash: getStoredCashBalance() ?? 0,
      holdings: [],
      activity: readStore(STORAGE_KEYS.activity, []),
    };

    const calcPortfolioValue = () =>
      state.holdings.reduce((sum, h) => sum + Number(h.total_value || 0), 0);

    const renderKPIs = () => {
      const pv = calcPortfolioValue();
      cashBalanceEl.textContent = money(state.cash);
      portfolioValueEl.textContent = money(pv);
      totalValueEl.textContent = money(state.cash + pv);
    };

    const renderHoldings = () => {
      holdingsBody.innerHTML = "";

      if (!state.holdings.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" class="muted">No holdings yet.</td>`;
        holdingsBody.appendChild(tr);
        return;
      }

      state.holdings.forEach((h) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="mono">${String(h.ticker).toUpperCase()}</td>
          <td>${h.company}</td>
          <td class="mono">${Number(h.shares).toLocaleString()}</td>
          <td class="mono">${money(h.price)}</td>
          <td class="mono">${money(h.total_value)}</td>
        `;
        holdingsBody.appendChild(tr);
      });
    };

    const badge = (type) => {
      const map = { deposit: "Deposit", withdraw: "Withdraw", buy: "Buy", sell: "Sell" };
      return map[type] || "Activity";
    };

    const renderActivity = () => {
      activityList.innerHTML = "";
      const items = [...state.activity].slice(-6).reverse();

      if (!items.length) {
        activityList.innerHTML = `<div class="activity-item muted">No activity yet.</div>`;
        return;
      }

      items.forEach((a) => {
        const sign = a.type === "withdraw" || a.type === "buy" ? "-" : "+";
        const amt = `${sign}${money(a.amount)}`;
        const div = document.createElement("div");
        div.className = "activity-item";
        div.innerHTML = `
          <div class="activity-left">
            <span class="badge">${badge(a.type)}</span>
            <span class="activity-note">${a.note || ""}</span>
          </div>
          <div class="activity-right">
            <span class="mono">${amt}</span>
            <span class="muted mono">${a.time}</span>
          </div>
        `;
        activityList.appendChild(div);
      });
    };

    const renderPortfolio = () => {
      renderKPIs();
      renderHoldings();
      renderActivity();
    };

const loadPortfolio = async () => {
  state.activity = readStore(STORAGE_KEYS.activity, state.activity);

  try {
    const data = await fetchJson(PORTFOLIO_ENDPOINT);
    console.log("portfolio response:", data);

    const returnedBalance = extractBalance(data);
    console.log("returnedBalance:", returnedBalance);

    if (returnedBalance !== null) {
      state.cash = returnedBalance;
      setStoredCashBalance(state.cash);
    } else {
      console.warn("Portfolio API did not return a recognized balance field.");
      state.cash = 0;
    }

    const rows = Array.isArray(data) ? data : (data?.portfolio || []);
    state.holdings = rows.map(mapRemoteHolding);
  } catch (err) {
    console.error("Load portfolio failed:", err);
    state.cash = 0;
    state.holdings = [];
  }

  renderPortfolio();
};
    if (cashForm) {
      cashForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const action = String(cashAction.value || "").toLowerCase();
        const amt = Number(cashAmount.value);

        if (!amt || amt <= 0) return;
        if (action !== "deposit" && action !== "withdraw") return;

        const endpoint = action === "deposit" ? DEPOSIT_ENDPOINT : WITHDRAW_ENDPOINT;
        const submitBtn = cashForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const data = await fetchJson(endpoint, {
            method: "POST",
            body: JSON.stringify({ amount: amt }),
          });

          const returnedBalance = extractBalance(data);
          if (returnedBalance !== null) {
            state.cash = returnedBalance;
          } else if (action === "deposit") {
            state.cash += amt;
          } else {
            state.cash -= amt;
          }

          const entry = {
            type: action,
            amount: amt,
            time: new Date().toLocaleString(),
            note: action === "deposit" ? "Cash deposit" : "Cash withdrawal",
          };

          state.activity.push(entry);
          writeStore(STORAGE_KEYS.activity, state.activity.slice(-50));
          setStoredCashBalance(state.cash);

          recordTransaction({
            dt: new Date().toISOString(),
            type: action,
            ticker: "-",
            shares: "-",
            price: "-",
            total: amt,
            status: "completed",
            notes: action === "deposit" ? "Cash deposit" : "Cash withdrawal",
          });

          cashAmount.value = "";
          renderPortfolio();
        } catch (err) {
          alert(`${action === "deposit" ? "Deposit" : "Withdraw"} failed: ` + err.message);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    if (resetCashBtn) resetCashBtn.addEventListener("click", () => {
      cashAmount.value = "";
    });

    if (refreshPortfolioBtn) refreshPortfolioBtn.addEventListener("click", loadPortfolio);

    loadPortfolio();
  }

  const txBody = document.getElementById("txBody");

  if (txBody) {
    const txSearch = document.getElementById("txSearch");
    const txType = document.getElementById("txType");
    const txStatus = document.getElementById("txStatus");
    const txFrom = document.getElementById("txFrom");
    const txTo = document.getElementById("txTo");
    const applyTxFilters = document.getElementById("applyTxFilters");
    const clearTxFilters = document.getElementById("clearTxFilters");
    const refreshTxBtn = document.getElementById("refreshTxBtn");
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    const txCountHelper = document.getElementById("txCountHelper");

    let allTx = [];

    const fmtDate = (iso) => new Date(iso).toLocaleString();

    const statusBadge = (status) => {
      const s = normalizeStatus(status);
      if (s === "completed") return `<span class="status status-ok">Completed</span>`;
      if (s === "pending") return `<span class="status status-warn">Pending</span>`;
      if (s === "canceled") return `<span class="status status-muted">Canceled</span>`;
      if (s === "rejected") return `<span class="status status-bad">Rejected</span>`;
      return `<span class="status status-muted">${status}</span>`;
    };

    const typeBadge = (type) => {
      const t = String(type || "").toLowerCase();
      const cls =
        t === "buy" ? "pill pill-buy" :
        t === "sell" ? "pill pill-sell" :
        t === "deposit" ? "pill pill-deposit" :
        t === "withdraw" ? "pill pill-withdraw" :
        "pill";
      return `<span class="${cls}">${t}</span>`;
    };

    const normalize = (v) => String(v ?? "").toLowerCase();

    const renderTransactions = (rows) => {
      txBody.innerHTML = "";

      if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8" class="muted">No transactions found for the selected filters.</td>`;
        txBody.appendChild(tr);
        txCountHelper.textContent = "0 results";
        return;
      }

      rows
        .sort((a, b) => new Date(b.dt) - new Date(a.dt))
        .forEach((r) => {
          const tr = document.createElement("tr");
          const shares = r.shares === "-" ? "-" : Number(r.shares).toLocaleString();
          const price = r.price === "-" ? "-" : money(r.price);
          const total = money(r.total);

          tr.innerHTML = `
            <td class="mono">${fmtDate(r.dt)}</td>
            <td>${typeBadge(r.type)}</td>
            <td class="mono">${String(r.ticker).toUpperCase()}</td>
            <td class="mono">${shares}</td>
            <td class="mono">${price}</td>
            <td class="mono">${total}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${r.notes || ""}</td>
          `;
          txBody.appendChild(tr);
        });

      txCountHelper.textContent = `${rows.length} result${rows.length === 1 ? "" : "s"}`;
    };

    const applyFilters = () => {
      const q = normalize(txSearch.value).trim();
      const type = txType.value;
      const status = txStatus.value;
      const from = txFrom.value ? new Date(txFrom.value + "T00:00:00") : null;
      const to = txTo.value ? new Date(txTo.value + "T23:59:59") : null;

      let rows = [...allTx];
      if (q) rows = rows.filter((r) => normalize(JSON.stringify(r)).includes(q));
      if (type !== "all") rows = rows.filter((r) => normalize(r.type) === type);
      if (status !== "all") rows = rows.filter((r) => normalize(normalizeStatus(r.status)) === status);
      if (from) rows = rows.filter((r) => new Date(r.dt) >= from);
      if (to) rows = rows.filter((r) => new Date(r.dt) <= to);

      renderTransactions(rows);
    };

    const refreshTx = async () => {
      const localCash = readStore(STORAGE_KEYS.transactions, [])
        .filter((item) => item?.type === "deposit" || item?.type === "withdraw")
        .map((item) => ({ ...item, status: normalizeStatus(item.status) }));

      try {
        const data = await fetchJson(TRANSACTION_HISTORY_ENDPOINT);
        const remoteRows = Array.isArray(data) ? data : data?.transactions || [];
        allTx = [...localCash, ...remoteRows.map(mapRemoteTransaction)];
      } catch {
        allTx = [...localCash];
      }

      applyFilters();
    };

    const exportCsv = () => {
      const q = normalize(txSearch.value).trim();
      const type = txType.value;
      const status = txStatus.value;
      const from = txFrom.value ? new Date(txFrom.value + "T00:00:00") : null;
      const to = txTo.value ? new Date(txTo.value + "T23:59:59") : null;

      let rows = [...allTx];
      if (q) rows = rows.filter((r) => normalize(JSON.stringify(r)).includes(q));
      if (type !== "all") rows = rows.filter((r) => normalize(r.type) === type);
      if (status !== "all") rows = rows.filter((r) => normalize(normalizeStatus(r.status)) === status);
      if (from) rows = rows.filter((r) => new Date(r.dt) >= from);
      if (to) rows = rows.filter((r) => new Date(r.dt) <= to);

      const header = ["datetime", "type", "ticker", "shares", "price", "total", "status", "notes"];
      const lines = [header.join(",")];

      rows
        .sort((a, b) => new Date(b.dt) - new Date(a.dt))
        .forEach((r) => {
          const line = [
            `"${fmtDate(r.dt)}"`,
            `"${r.type}"`,
            `"${r.ticker}"`,
            `"${r.shares}"`,
            `"${r.price}"`,
            `"${r.total}"`,
            `"${r.status}"`,
            `"${(r.notes || "").replaceAll('"', '""')}"`
          ].join(",");
          lines.push(line);
        });

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transaction-history.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    applyTxFilters.addEventListener("click", applyFilters);
    clearTxFilters.addEventListener("click", () => {
      txSearch.value = "";
      txType.value = "all";
      txStatus.value = "all";
      txFrom.value = "";
      txTo.value = "";
      applyFilters();
    });
    refreshTxBtn.addEventListener("click", refreshTx);
    exportCsvBtn.addEventListener("click", exportCsv);

    refreshTx();
  }
});
