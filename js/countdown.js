/* ============================================================
   clocks-go-back — countdown + region clock + dynamic tags
   Rules:
   - US & Canada: DST ends first Sunday of November, 2:00 AM local
     (instant computed for US Eastern: 2:00 AM EDT = 06:00 UTC)
   - UK: DST ends last Sunday of October, 2:00 AM BST = 01:00 UTC
   - EU: DST ends last Sunday of October, 3:00 AM CEST = 01:00 UTC
   All times are rule-based, so the site stays correct every year.
   ============================================================ */
(function () {
  "use strict";

  function firstSundayOf(year, month /* 0-based */) {
    const d = new Date(Date.UTC(year, month, 1));
    return 1 + ((7 - d.getUTCDay()) % 7);
  }
  function lastSundayOf(year, month) {
    const d = new Date(Date.UTC(year, month + 1, 0));
    return d.getUTCDate() - d.getUTCDay();
  }
  /* next fall-back instant, computed per region rule */
  function nextFallBack(regionKey, now) {
    const y = now.getUTCFullYear();
    const candidates = [];
    for (const year of [y, y + 1]) {
      if (regionKey === "us") {
        candidates.push(new Date(Date.UTC(year, 10, firstSundayOf(year, 10), 6, 0, 0)));
      } else {
        // UK & EU switch at the same UTC instant
        candidates.push(new Date(Date.UTC(year, 9, lastSundayOf(year, 9), 1, 0, 0)));
      }
    }
    return candidates.find(c => c > now);
  }

  var REGIONS = {
    us: {
      name: "the United States",
      tz: "America/New_York", city: "New York (ET)",
      chg: ["2:00 AM", "1:00 AM"],
      chgSub: "The 1 o'clock hour happens <strong>twice</strong> — that's the hour you get back.",
      repeatedHour: [1, 2],
      detail: function (target) {
        return "Clocks fall back from 2:00 AM to 1:00 AM local time — you gain one hour of sleep.";
      }
    },
    uk: {
      name: "the United Kingdom",
      tz: "Europe/London", city: "London (GMT/BST)",
      chg: ["2:00 AM", "1:00 AM"],
      chgSub: "The 1 o'clock hour happens <strong>twice</strong> — that's the hour you get back.",
      repeatedHour: [1, 2],
      detail: function () {
        return "Clocks go back from 2:00 AM to 1:00 AM GMT — you gain one hour of sleep.";
      }
    },
    eu: {
      name: "Europe",
      tz: "Europe/Paris", city: "Paris / Berlin (CET)",
      chg: ["3:00 AM", "2:00 AM"],
      chgSub: "The 2 o'clock hour happens <strong>twice</strong> — that's the hour you get back.",
      repeatedHour: [2, 3],
      detail: function () {
        return "Clocks go back from 3:00 AM to 2:00 AM CET — you gain one hour of sleep.";
      }
    }
  };

  var region = "us";
  var targets = {};
  ["us", "uk", "eu"].forEach(function (k) { targets[k] = nextFallBack(k, new Date()); });

  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, "0"); }

  /* ── fall-back wedge: highlight the repeated hour on the dial ── */
  function polar(r, deg) {
    var a = deg * Math.PI / 180;
    return [60 + r * Math.sin(a), 60 - r * Math.cos(a)];
  }
  function sectorPath(rIn, rOut, d1, d2) {
    var p1 = polar(rOut, d1), p2 = polar(rOut, d2), p3 = polar(rIn, d2), p4 = polar(rIn, d1);
    return "M " + p1[0] + " " + p1[1] +
      " A " + rOut + " " + rOut + " 0 0 1 " + p2[0] + " " + p2[1] +
      " L " + p3[0] + " " + p3[1] +
      " A " + rIn + " " + rIn + " 0 0 0 " + p4[0] + " " + p4[1] + " Z";
  }
  function rimPath(r, d1, d2) {
    var p1 = polar(r, d1), p2 = polar(r, d2);
    return "M " + p1[0] + " " + p1[1] + " A " + r + " " + r + " 0 0 1 " + p2[0] + " " + p2[1];
  }
  function drawFallBackWedge() {
    var h = REGIONS[region].repeatedHour;
    var d1 = h[0] * 30, d2 = h[1] * 30;
    $("fbWedge").setAttribute("d", sectorPath(24, 49, d1, d2));
    $("fbRim").setAttribute("d", rimPath(52, d1, d2));
    var mid = polar(15, (d1 + d2) / 2);
    $("fbLabel").setAttribute("x", mid[0]);
    $("fbLabel").setAttribute("y", mid[1] + 3.5);
  }

  /* ── live analog clock in the selected region's timezone ── */
  function regionNow(tz) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).formatToParts(new Date());
    function get(t) {
      var p = parts.find(function (x) { return x.type === t; });
      return parseInt(p.value, 10);
    }
    return { h: get("hour") % 24, m: get("minute"), s: get("second") };
  }
  function tickClock() {
    var t = regionNow(REGIONS[region].tz);
    var sec = t.s + (Date.now() % 1000) / 1000;
    var min = t.m + sec / 60;
    var hr = (t.h % 12) + min / 60;
    function rot(deg) { return "rotate(" + deg + " 60 60)"; }
    $("clk-h").setAttribute("transform", rot(hr * 30));
    $("clk-m").setAttribute("transform", rot(min * 6));
    $("clk-s").setAttribute("transform", rot(sec * 6));
    var ampm = t.h < 12 ? "AM" : "PM";
    $("clockLive").textContent =
      REGIONS[region].city + " — " + pad(t.h % 12 || 12) + ":" + pad(t.m) + ":" + pad(t.s) + " " + ampm;
  }

  /* ── countdown ── */
  function tick() {
    var now = new Date();
    var target = targets[region];
    var diff = target - now;

    if (diff <= 0) { // rolled over — recompute
      targets[region] = nextFallBack(region, now);
      target = targets[region];
      diff = target - now;
    }

    $("cd-d").textContent = Math.floor(diff / 86400000);
    $("cd-h").textContent = pad(Math.floor(diff % 86400000 / 3600000));
    $("cd-m").textContent = pad(Math.floor(diff % 3600000 / 60000));
    $("cd-s").textContent = pad(Math.floor(diff % 60000 / 1000));

    var dstr = target.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    $("cdAnswer").innerHTML =
      "Clocks go back in <strong>" + REGIONS[region].name + "</strong> on <strong>" +
      dstr + "</strong> · " + REGIONS[region].chg[0] + " local time.<br>" + REGIONS[region].detail();

    // "tonight" banner: change falls within the next 12 hours
    $("tonightBanner").classList.toggle("show", diff > 0 && diff < 12 * 3600000);
  }

  /* ── date table: dynamic status tags ──
     The table rows show the 2026 cycle (verified dates), so tags are computed
     against these fixed instants — NOT the rolling countdown targets. */
  var CYCLE_2026 = {
    uk: new Date("2026-10-25T01:00:00Z"),
    eu: new Date("2026-10-25T01:00:00Z"),
    us: new Date("2026-11-01T06:00:00Z")
  };
  function localDateStr(tz, date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(date);
  }
  function updateDateTable() {
    var now = new Date();
    var keys = ["uk", "eu", "us"];
    var nextKey = keys
      .filter(function (k) { return CYCLE_2026[k] > now; })
      .sort(function (a, b) { return CYCLE_2026[a] - CYCLE_2026[b]; })[0] || null;

    keys.forEach(function (k) {
      var row = $("row-" + k), tag = $("tag-" + k);
      if (!row || !tag) return;
      row.classList.remove("upcoming-row", "tonight-row");
      tag.className = "tag";
      tag.textContent = "";

      var sameLocalDate = localDateStr(REGIONS[k].tz, now) === localDateStr(REGIONS[k].tz, CYCLE_2026[k]);
      if (CYCLE_2026[k] > now && sameLocalDate) {
        tag.classList.add("tonight");
        tag.textContent = "TONIGHT";
        row.classList.add("tonight-row");
      } else if (CYCLE_2026[k] <= now && sameLocalDate) {
        tag.classList.add("done");
        tag.textContent = "CHANGED TODAY ✓";
      } else if (k === nextKey) {
        tag.classList.add("upcoming");
        tag.textContent = "NEXT";
        row.classList.add("upcoming-row");
      }
    });
  }

  /* ── region tabs ── */
  function setRegion(r) {
    region = r;
    var cfg = REGIONS[r];
    document.querySelectorAll("#regionTabs button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.region === r);
    });
    $("chgFrom").textContent = cfg.chg[0];
    $("chgTo").textContent = cfg.chg[1];
    $("chgSub").innerHTML = cfg.chgSub;
    drawFallBackWedge();
    tickClock();
    tick();
  }
  document.querySelectorAll("#regionTabs button").forEach(function (b) {
    b.addEventListener("click", function () { setRegion(b.dataset.region); });
  });

  /* ── FAQ accordion ── */
  document.querySelectorAll(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.parentElement;
      item.classList.toggle("open");
      q.setAttribute("aria-expanded", item.classList.contains("open") ? "true" : "false");
    });
  });

  /* ── calendar reminder (.ics) ── */
  function icsStamp(date) {
    return date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) + "T" +
      pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + "00Z";
  }
  function downloadICS(filename, regionKey) {
    var target = targets[regionKey];
    // reminder fires at 18:00 local the evening before the change
    var remind = new Date(target.getTime() - 24 * 3600000);
    remind = new Date(Date.UTC(remind.getUTCFullYear(), remind.getUTCMonth(), remind.getUTCDate(), 18, 0, 0));
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//clocksgoback//EN",
      "BEGIN:VEVENT",
      "UID:fall-back-" + regionKey + "-" + target.getTime() + "@clocks.toolara.dev",
      "DTSTAMP:" + icsStamp(new Date()),
      "DTSTART:" + icsStamp(remind),
      "DTEND:" + icsStamp(new Date(remind.getTime() + 30 * 60000)),
      "SUMMARY:Clocks go back tonight (fall back 1 hour)",
      "DESCRIPTION:Daylight saving time ends — turn clocks back one hour before bed. Details: https://clocksgoback.toolara.dev/",
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY",
      "DESCRIPTION:Clocks go back tonight", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $("ics-us").addEventListener("click", function () { downloadICS("clocks-go-back-us.ics", "us"); });
  $("ics-uk").addEventListener("click", function () { downloadICS("clocks-go-back-uk-eu.ics", "uk"); });

  /* ── init ── */
  drawFallBackWedge();
  tickClock();
  tick();
  updateDateTable();
  setInterval(tickClock, 50);
  setInterval(tick, 1000);
  setInterval(updateDateTable, 60000);
})();
