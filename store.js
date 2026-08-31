/* =========================================================================
   Pokepedia — Almacenamiento local: tema, favoritos, historial y equipos
   ========================================================================= */

PW.store = (function () {
    'use strict';

    function read(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }
    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            /* almacenamiento lleno o no disponible: se ignora silenciosamente */
        }
    }

    /* ---------- Tema ---------- */
    var THEME_KEY = 'pw_theme';
    function getTheme() {
        return localStorage.getItem(THEME_KEY) || null;
    }
    function setTheme(theme) {
        if (theme) localStorage.setItem(THEME_KEY, theme);
        else localStorage.removeItem(THEME_KEY);
    }

    /* ---------- Favoritos ---------- */
    var FAV_KEY = 'pw_favs';
    function getFavs() {
        return read(FAV_KEY) || [];
    }
    function toggleFav(id) {
        var favs = getFavs();
        var i = favs.indexOf(id);
        if (i === -1) favs.push(id);
        else favs.splice(i, 1);
        write(FAV_KEY, favs);
        return favs.indexOf(id) !== -1;
    }
    function isFav(id) {
        return getFavs().indexOf(id) !== -1;
    }
    function clearFavs() {
        localStorage.removeItem(FAV_KEY);
    }

    /* ---------- Historial de vistos ---------- */
    var HIST_KEY = 'pw_history';
    var HIST_MAX = 14;
    function getHistory() {
        return read(HIST_KEY) || [];
    }
    function addHistory(id) {
        var hist = getHistory().filter(function (x) { return x !== id; });
        hist.unshift(id);
        if (hist.length > HIST_MAX) hist.length = HIST_MAX;
        write(HIST_KEY, hist);
        return hist;
    }
    function clearHistory() {
        localStorage.removeItem(HIST_KEY);
    }

    /* ---------- Equipos ---------- */
    var TEAMS_KEY = 'pw_teams';
    function getTeams() {
        return read(TEAMS_KEY) || [];
    }
    function saveTeam(team) {
        var teams = getTeams();
        var found = teams.filter(function (t) { return t.id === team.id; })[0];
        if (found) {
            found.name = team.name;
            found.ids = team.ids;
        } else {
            team.id = 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            teams.push(team);
        }
        write(TEAMS_KEY, teams);
        return team;
    }
    function deleteTeam(id) {
        write(TEAMS_KEY, getTeams().filter(function (t) { return t.id !== id; }));
    }
    function getTeamById(id) {
        return getTeams().filter(function (t) { return t.id === id; })[0] || null;
    }

    return {
        getTheme: getTheme,
        setTheme: setTheme,
        getFavs: getFavs,
        toggleFav: toggleFav,
        isFav: isFav,
        clearFavs: clearFavs,
        getHistory: getHistory,
        addHistory: addHistory,
        clearHistory: clearHistory,
        getTeams: getTeams,
        saveTeam: saveTeam,
        deleteTeam: deleteTeam,
        getTeamById: getTeamById,
        read: read,
        write: write
    };
})();
