// ==========================================================================
// HỆ THỐNG HỌC TẬP SONG NGỮ TRUNG - VIỆT (FULL FEATURES - FIXED & UPGRADED)
// ==========================================================================

// ===== 1. KHO LƯU TRỮ DỮ LIỆU =====
let docVault = JSON.parse(localStorage.getItem('docVault_v5')) || {};
let termVault = JSON.parse(localStorage.getItem('termVault_v5')) || {};
let quizVault = JSON.parse(localStorage.getItem('quizVault_v5')) || {};

let activeDocName = localStorage.getItem('activeDocName_v5') || '';
let activeTermName = localStorage.getItem('activeTermName_v5') || '';
let activeQuizName = localStorage.getItem('activeQuizName_v5') || '';

let notes = JSON.parse(localStorage.getItem('studyNotes_v5')) || [];
let scoreHistory = JSON.parse(localStorage.getItem('quizScoreHistory_v5')) || [];
let lessonBlocks = JSON.parse(localStorage.getItem('simpleLessonBlocks_v1')) || [];
let simpleTerms = JSON.parse(localStorage.getItem('simpleTerms_v1')) || [];
let chapterLog = JSON.parse(localStorage.getItem('cultureChapterLog_v1')) || [];
let cultureGroups = JSON.parse(localStorage.getItem('cultureGroups_v1') || '["Chinese Culture"]');
let activeCultureGroup = localStorage.getItem('activeCultureGroup_v1') || cultureGroups[0] || 'Chinese Culture';
let quizBank = JSON.parse(localStorage.getItem('cultureQuizBank_v1')) || [];
let quizUsedIds = JSON.parse(localStorage.getItem('cultureQuizUsedIds_v1')) || {};
let readerMarks = JSON.parse(localStorage.getItem('cultureReaderMarks_v1')) || [];

let quizQuestions = [];
let userAnswers = [];
let currentQuizSection = 0;
let activeQuizSource = localStorage.getItem('activeQuizSource_v1') || '';
const questionsPerSet = 10;
let readerPageIndex = 0;
let pendingReaderSelection = null;
let readerMarkDraft = { bold: false, italic: false, underline: false };

// Biến điều khiển hệ thống Popup
let isPopupVisible = false;
let selectedText = '';
let selectedBlock = 'N/A';
let currentNoteView = 'grid'; // grid, list, original, detailed

// Tập hợp lưu trữ các ID ghi chú được chọn hàng loạt (Bulk Actions)
let selectedNotes = new Set();

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

// ===== 2. KHỞI TẠO TRANG =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Study studio loaded.');
    
    initTabs();
    initDarkMode();
    initStudyModes();
    initSidebar();
    initFileImports();
    initHighlightSystem();
    initQuizEngine();
    initReadingSettings();
    initCultureGroups();
    initSimpleLessonBuilder();
    initNoteViewControls();
    initBulkActions();
    autoLoadSavedData();
    
    console.log('Study studio is ready.');
});

// ===== 3. HÀM KHỞI TẠO CÁC THÀNH PHẦN =====
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(this.dataset.tab);
            if (target) target.classList.add('active');
            if (this.dataset.tab === 'tab-notes') {
                selectedNotes.clear(); // Reset trạng thái chọn hàng loạt khi đổi tab
                renderNotes();
                updateBulkActionsUI();
            }
        });
    });
}

function saveCultureGroups() {
    cultureGroups = [...new Set((Array.isArray(cultureGroups) ? cultureGroups : ['Chinese Culture']).filter(Boolean))];
    if (!cultureGroups.length) cultureGroups = ['Chinese Culture'];
    if (!cultureGroups.includes(activeCultureGroup)) activeCultureGroup = cultureGroups[0];
    localStorage.setItem('cultureGroups_v1', JSON.stringify(cultureGroups));
    localStorage.setItem('activeCultureGroup_v1', activeCultureGroup);
}

function initCultureGroups() {
    saveCultureGroups();
    const select = document.getElementById('cultureGroupSelect');
    const addBtn = document.getElementById('addCultureGroupBtn');
    const renameBtn = document.getElementById('renameCultureGroupBtn');
    const deleteBtn = document.getElementById('deleteCultureGroupBtn');
    if (select) {
        select.addEventListener('change', () => {
            activeCultureGroup = select.value;
            saveCultureGroups();
            renderSidebarLists();
        });
    }
    if (addBtn) addBtn.addEventListener('click', addCultureGroup);
    if (renameBtn) renameBtn.addEventListener('click', renameCultureGroup);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCultureGroup);
    renderCultureGroupSelect();
}

function renderCultureGroupSelect() {
    const select = document.getElementById('cultureGroupSelect');
    if (!select) return;
    select.innerHTML = cultureGroups.map(group => `<option value="${escapeHTML(group)}">${escapeHTML(group)}</option>`).join('');
    select.value = cultureGroups.includes(activeCultureGroup) ? activeCultureGroup : cultureGroups[0];
}

function addCultureGroup() {
    const input = document.getElementById('cultureGroupInput');
    const name = input?.value.trim();
    if (!name) return alert('Enter a group name.');
    if (!cultureGroups.includes(name)) cultureGroups.push(name);
    activeCultureGroup = name;
    if (input) input.value = '';
    saveCultureGroups();
    renderCultureGroupSelect();
    renderSidebarLists();
}

function renameCultureGroup() {
    const oldName = activeCultureGroup;
    const name = prompt('New group name:', oldName);
    if (!name || !name.trim()) return;
    const clean = name.trim();
    cultureGroups = cultureGroups.map(group => group === oldName ? clean : group);
    chapterLog.forEach(entry => {
        if ((entry.group || 'Chinese Culture') === oldName) entry.group = clean;
    });
    activeCultureGroup = clean;
    localStorage.setItem('cultureChapterLog_v1', JSON.stringify(chapterLog));
    saveCultureGroups();
    renderCultureGroupSelect();
    renderSidebarLists();
}

function deleteCultureGroup() {
    if (cultureGroups.length <= 1) return alert('Keep at least one group.');
    const oldName = activeCultureGroup;
    if (!confirm(`Delete group "${oldName}"? Chapters stay saved and move to the first remaining group.`)) return;
    cultureGroups = cultureGroups.filter(group => group !== oldName);
    activeCultureGroup = cultureGroups[0];
    chapterLog.forEach(entry => {
        if ((entry.group || 'Chinese Culture') === oldName) entry.group = activeCultureGroup;
    });
    localStorage.setItem('cultureChapterLog_v1', JSON.stringify(chapterLog));
    saveCultureGroups();
    renderCultureGroupSelect();
    renderSidebarLists();
}

function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('cultureAppTheme_v1') || 'light';
    const applyAppTheme = theme => {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        if (themeToggle) themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
        localStorage.setItem('cultureAppTheme_v1', theme);
    };
    applyAppTheme(savedTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            applyAppTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
        });
    }
}

function initReadingSettings() {
    const defaults = {
        fontSize: '18',
        lineHeight: '1.8',
        width: 'comfort',
        theme: 'pink',
        layout: 'bilingual'
    };
    const saved = JSON.parse(localStorage.getItem('cultureReadingSettings_v1') || 'null') || defaults;
    const settings = { ...defaults, ...saved };
    const controls = {
        fontSize: document.getElementById('readerFontSize'),
        lineHeight: document.getElementById('readerLineHeight'),
        width: document.getElementById('readerWidth'),
        theme: document.getElementById('readerTheme'),
        layout: document.getElementById('readerLayout')
    };
    const resetBtn = document.getElementById('readerResetBtn');

    Object.entries(controls).forEach(([key, control]) => {
        if (!control) return;
        control.value = settings[key];
        control.addEventListener('change', () => {
            const next = getReadingSettingsFromControls(defaults);
            applyReadingSettings(next);
            localStorage.setItem('cultureReadingSettings_v1', JSON.stringify(next));
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Object.entries(controls).forEach(([key, control]) => {
                if (control) control.value = defaults[key];
            });
            applyReadingSettings(defaults);
            localStorage.setItem('cultureReadingSettings_v1', JSON.stringify(defaults));
        });
    }

    applyReadingSettings(settings);
}

function initStudyModes() {
    const savedMode = localStorage.getItem('cultureStudyMode_v1') || 'study';
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setStudyMode(btn.dataset.mode || 'study'));
    });
    document.getElementById('openReaderBtn')?.addEventListener('click', openReaderMode);
    document.getElementById('readerCloseBtn')?.addEventListener('click', closeReaderMode);
    document.getElementById('readerExitFocus')?.addEventListener('click', () => {
        closeReaderMode();
        setStudyMode('study');
    });
    document.getElementById('readerPrevBtn')?.addEventListener('click', () => turnReaderPage(-1));
    document.getElementById('readerNextBtn')?.addEventListener('click', () => turnReaderPage(1));
    document.getElementById('readerSpeakBtn')?.addEventListener('click', speakCurrentReaderPage);
    document.getElementById('readerFontPlus')?.addEventListener('click', () => adjustReaderFont(2));
    document.getElementById('readerFontMinus')?.addEventListener('click', () => adjustReaderFont(-2));
    document.getElementById('readerThemeCycle')?.addEventListener('click', cycleReaderTheme);
    document.getElementById('readerClearMarksBtn')?.addEventListener('click', clearReaderMarksForPage);
    document.getElementById('readerToolMenu')?.addEventListener('click', () => {
        document.getElementById('progressSidebar')?.classList.toggle('open');
    });
    initReaderMarkTools();
    document.addEventListener('keydown', event => {
        if (!document.body.classList.contains('reader-open')) return;
        if (event.key === 'Escape') closeReaderMode();
        if (event.key === 'ArrowLeft') turnReaderPage(-1);
        if (event.key === 'ArrowRight') turnReaderPage(1);
    });
    setStudyMode(savedMode);
}

function setStudyMode(mode) {
    const finalMode = ['study', 'reading', 'focus'].includes(mode) ? mode : 'study';
    document.body.classList.remove('mode-study', 'mode-reading', 'mode-focus');
    document.body.classList.add(`mode-${finalMode}`);
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === finalMode));
    localStorage.setItem('cultureStudyMode_v1', finalMode);
    if (finalMode === 'reading') openReaderMode();
    if (finalMode === 'focus') {
        document.querySelector('[data-tab="tab-original"]')?.click();
    }
}

function getReaderPages() {
    if (!lessonBlocks.length) {
        return [{ zh: 'No lesson yet. Paste Chinese text, then build a lesson first.', vi: '' }];
    }
    return lessonBlocks.map((block, idx) => ({
        zh: block.zh,
        vi: block.vi,
        title: activeDocName ? activeDocName.replace(/\.builder$|\.csv$/i, '') : `Chapter ${idx + 1}`
    }));
}

function openReaderMode() {
    readerPageIndex = Math.max(0, Math.min(readerPageIndex, getReaderPages().length - 1));
    document.body.classList.add('reader-open');
    const overlay = document.getElementById('readerOverlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
    renderReaderPage();
}

function closeReaderMode() {
    document.body.classList.remove('reader-open');
    const overlay = document.getElementById('readerOverlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

function renderReaderPage() {
    const pages = getReaderPages();
    const page = pages[readerPageIndex] || pages[0];
    const book = document.getElementById('readerBook');
    if (!book) return;
    document.getElementById('readerTitle').textContent = page.title || 'Reading Mode';
    document.getElementById('readerPageInfo').textContent = `${readerPageIndex + 1}/${pages.length}`;
    book.innerHTML = `<article class="reader-page ${page.vi ? '' : 'single'}">
        <section class="reader-column reader-zh" data-reader-column="zh">${renderMarkedReaderText(page.zh, readerPageIndex, 'zh')}</section>
        ${page.vi ? `<section class="reader-column reader-vi" data-reader-column="vi">${renderMarkedReaderText(page.vi, readerPageIndex, 'vi')}</section>` : ''}
    </article>`;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderMarkedReaderText(text, pageIndex, column) {
    let html = escapeHTML(text || '');
    const marks = readerMarks
        .filter(mark => mark.pageIndex === pageIndex && mark.column === column && mark.text)
        .sort((a, b) => String(b.text).length - String(a.text).length);

    marks.forEach(mark => {
        const escapedText = escapeHTML(mark.text);
        const style = [
            mark.style === 'heading' ? 'font-size:1.25em;font-weight:800;display:inline' : '',
            mark.bold ? 'font-weight:800' : '',
            mark.italic ? 'font-style:italic' : '',
            mark.underline ? 'text-decoration:underline;text-underline-offset:0.12em' : '',
            mark.size ? `font-size:${escapeHTML(mark.size)}` : '',
            mark.color ? `color:${escapeHTML(mark.color)}` : '',
            mark.highlight && mark.highlight !== 'transparent' ? `background:${escapeHTML(mark.highlight)}` : ''
        ].filter(Boolean).join(';');
        const title = mark.note ? ` title="${escapeHTML(mark.note)}"` : '';
        const replacement = `<mark class="reader-saved-mark" style="${style}"${title}>${escapedText}</mark>`;
        html = html.replace(new RegExp(escapeRegExp(escapedText), 'g'), replacement);
    });

    return html;
}

function initReaderMarkTools() {
    const book = document.getElementById('readerBook');
    const toolbar = document.getElementById('readerMarkToolbar');
    if (!book || !toolbar) return;

    book.addEventListener('mouseup', event => {
        setTimeout(() => captureReaderSelection(event), 0);
    });

    document.getElementById('readerBoldBtn')?.addEventListener('click', () => toggleReaderMarkDraft('bold'));
    document.getElementById('readerItalicBtn')?.addEventListener('click', () => toggleReaderMarkDraft('italic'));
    document.getElementById('readerUnderlineBtn')?.addEventListener('click', () => toggleReaderMarkDraft('underline'));
    document.getElementById('readerSaveMarkBtn')?.addEventListener('click', saveReaderMark);
    document.getElementById('readerCancelMarkBtn')?.addEventListener('click', hideReaderMarkToolbar);
    document.getElementById('readerClearPageMarksBtn')?.addEventListener('click', clearReaderMarksForPage);
}

function captureReaderSelection(event) {
    if (!document.body.classList.contains('reader-open')) return;
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    const toolbar = document.getElementById('readerMarkToolbar');
    if (!text || text.length < 2 || !toolbar) {
        hideReaderMarkToolbar();
        return;
    }

    let node = selection.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    const columnEl = node?.closest?.('.reader-column');
    if (!columnEl || !document.getElementById('readerBook')?.contains(columnEl)) return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    pendingReaderSelection = {
        text,
        pageIndex: readerPageIndex,
        column: columnEl.dataset.readerColumn || 'zh'
    };
    readerMarkDraft = { bold: false, italic: false, underline: false };
    document.getElementById('readerBoldBtn')?.classList.remove('active');
    document.getElementById('readerItalicBtn')?.classList.remove('active');
    document.getElementById('readerUnderlineBtn')?.classList.remove('active');
    const style = document.getElementById('readerMarkStyle');
    if (style) style.value = 'normal';
    const size = document.getElementById('readerMarkSize');
    if (size) size.value = '';
    const color = document.getElementById('readerFontColor');
    if (color) color.value = '';
    const highlight = document.getElementById('readerHighlightColor');
    if (highlight) highlight.value = '#6f5f1d';
    const note = document.getElementById('readerMarkNote');
    if (note) note.value = '';

    toolbar.classList.add('show');
    toolbar.setAttribute('aria-hidden', 'false');
    toolbar.style.left = `${Math.min(window.innerWidth - 330, Math.max(16, rect.left))}px`;
    toolbar.style.top = `${Math.min(window.innerHeight - 260, Math.max(16, rect.bottom + 12))}px`;
}

function toggleReaderMarkDraft(key) {
    readerMarkDraft[key] = !readerMarkDraft[key];
    const buttonId = key === 'bold' ? 'readerBoldBtn' : 'readerItalicBtn';
    document.getElementById(buttonId)?.classList.toggle('active', readerMarkDraft[key]);
}

function hideReaderMarkToolbar() {
    const toolbar = document.getElementById('readerMarkToolbar');
    if (!toolbar) return;
    toolbar.classList.remove('show');
    toolbar.setAttribute('aria-hidden', 'true');
    pendingReaderSelection = null;
    window.getSelection()?.removeAllRanges();
}

function saveReaderMark() {
    if (!pendingReaderSelection) return;
    const note = document.getElementById('readerMarkNote')?.value.trim() || '';
    const mark = {
        id: Date.now(),
        text: pendingReaderSelection.text,
        pageIndex: pendingReaderSelection.pageIndex,
        column: pendingReaderSelection.column,
        style: document.getElementById('readerMarkStyle')?.value || 'normal',
        size: document.getElementById('readerMarkSize')?.value || '',
        bold: readerMarkDraft.bold,
        italic: readerMarkDraft.italic,
        underline: readerMarkDraft.underline,
        color: document.getElementById('readerFontColor')?.value || '',
        highlight: document.getElementById('readerHighlightColor')?.value || '#6f5f1d',
        note,
        title: document.getElementById('readerTitle')?.textContent || 'Reading Mode',
        time: new Date().toLocaleString('en-US')
    };
    readerMarks.push(mark);
    localStorage.setItem('cultureReaderMarks_v1', JSON.stringify(readerMarks));

    notes.push({
        id: mark.id,
        text: mark.text,
        comment: note || 'Reader highlight',
        color: mark.highlight === '#365a43' ? 'green' : mark.highlight === '#334d63' ? 'blue' : mark.highlight === '#613c49' ? 'pink' : 'yellow',
        block: `Reader ${mark.pageIndex + 1}`,
        time: mark.time
    });
    localStorage.setItem('studyNotes_v5', JSON.stringify(notes));

    hideReaderMarkToolbar();
    window.getSelection()?.removeAllRanges();
    renderReaderPage();
}

function clearReaderMarksForPage() {
    const pageNumber = readerPageIndex + 1;
    if (!confirm(`Clear all saved reader marks on page ${pageNumber}?`)) return;
    readerMarks = readerMarks.filter(mark => mark.pageIndex !== readerPageIndex);
    localStorage.setItem('cultureReaderMarks_v1', JSON.stringify(readerMarks));
    hideReaderMarkToolbar();
    renderReaderPage();
}

function turnReaderPage(direction) {
    const total = getReaderPages().length;
    readerPageIndex = Math.max(0, Math.min(total - 1, readerPageIndex + direction));
    hideReaderMarkToolbar();
    renderReaderPage();
}

function speakCurrentReaderPage() {
    const page = getReaderPages()[readerPageIndex];
    if (page) speakChinese(page.zh);
}

function adjustReaderFont(delta) {
    const select = document.getElementById('readerFontSize');
    if (!select) return;
    const values = Array.from(select.options).map(option => Number(option.value));
    const current = Number(select.value || 18);
    const next = values.reduce((best, value) => Math.abs(value - (current + delta)) < Math.abs(best - (current + delta)) ? value : best, values[0]);
    select.value = String(next);
    select.dispatchEvent(new Event('change'));
}

function cycleReaderTheme() {
    const select = document.getElementById('readerTheme');
    if (!select) return;
    const values = Array.from(select.options).map(option => option.value);
    const next = values[(values.indexOf(select.value) + 1) % values.length];
    select.value = next;
    select.dispatchEvent(new Event('change'));
}

function getReadingSettingsFromControls(defaults) {
    return {
        fontSize: document.getElementById('readerFontSize')?.value || defaults.fontSize,
        lineHeight: document.getElementById('readerLineHeight')?.value || defaults.lineHeight,
        width: document.getElementById('readerWidth')?.value || defaults.width,
        theme: document.getElementById('readerTheme')?.value || defaults.theme,
        layout: document.getElementById('readerLayout')?.value || defaults.layout
    };
}

function applyReadingSettings(settings) {
    const widthOptions = ['narrow', 'comfort', 'full'];
    const themeOptions = ['pink', 'cream', 'white', 'night'];
    const layoutOptions = ['bilingual', 'paper'];
    document.body.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
    document.body.style.setProperty('--reader-line-height', settings.lineHeight);
    widthOptions.forEach(option => document.body.classList.toggle(`reader-width-${option}`, settings.width === option));
    themeOptions.forEach(option => document.body.classList.toggle(`reader-theme-${option}`, settings.theme === option));
    layoutOptions.forEach(option => document.body.classList.toggle(`reader-layout-${option}`, settings.layout === option));
}

function initSidebar() {
    const sidebar = document.getElementById('progressSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
}

function initFileImports() {
    const docInput = document.getElementById('csvDocInput');
    if (docInput) {
        docInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                docVault[file.name] = evt.target.result;
                activeDocName = file.name;
                localStorage.setItem('docVault_v5', JSON.stringify(docVault));
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(evt.target.result);
                addChapterLog(file.name, 'Imported CSV');
                renderSidebarLists();
                const docStatus = document.getElementById('docStatus');
                if (docStatus) docStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const termInput = document.getElementById('csvTermInput');
    if (termInput) {
        termInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                termVault[file.name] = evt.target.result;
                activeTermName = file.name;
                localStorage.setItem('termVault_v5', JSON.stringify(termVault));
                localStorage.setItem('activeTermName_v5', activeTermName);
                parseTermCSV(evt.target.result);
                renderSidebarLists();
                const termStatus = document.getElementById('termStatus');
                if (termStatus) termStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const quizInput = document.getElementById('csvQuizInput');
    if (quizInput) {
        quizInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const csvText = evt.target.result;
                quizVault[file.name] = { csvText: csvText, answers: [] };
                activeQuizName = file.name;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                activeQuizSource = 'csv';
                localStorage.setItem('activeQuizSource_v1', activeQuizSource);
                parseQuizCSV(csvText);
                renderSidebarLists();
                updateQuizSourceStatus();
                const quizStatus = document.getElementById('quizStatus');
                if (quizStatus) quizStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const clearBtn = document.getElementById('clearAllCacheBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Clear all saved study data?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
}

function initNoteViewControls() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNoteView = this.dataset.view;
            renderNotes();
        });
    });
}

// ===== 4. KHỞI TẠO CHẾ ĐỘ CHỌN & XỬ LÝ HÀNG LOẠT (BULK ACTIONS) =====
function initBulkActions() {
    const selectAllBtn = document.getElementById('selectAllNotes');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const visibleCheckboxes = document.querySelectorAll('.note-checkbox');
            const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
            
            visibleCheckboxes.forEach(cb => {
                cb.checked = !allChecked;
                const noteId = parseInt(cb.dataset.id);
                if (!allChecked) {
                    selectedNotes.add(noteId);
                } else {
                    selectedNotes.delete(noteId);
                }
            });
            updateBulkActionsUI();
        });
    }

    const deleteSelectedBtn = document.getElementById('deleteSelectedNotes');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
            if (selectedNotes.size === 0) {
                alert('Please select at least one note to delete.');
                return;
            }
            if (confirm(`Delete ${selectedNotes.size} selected note(s)?`)) {
                notes = notes.filter(n => !selectedNotes.has(n.id));
                localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
                selectedNotes.clear();
                renderNotes();
                updateBulkActionsUI();
            }
        });
    }

    const exportBtn = document.getElementById('exportNotesCSV');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            triggerExportModal();
        });
    }

    const groupByBlockBtn = document.getElementById('groupByBlock');
    if (groupByBlockBtn) {
        groupByBlockBtn.addEventListener('click', function() {
            groupNotesByBlock();
        });
    }
}

function updateBulkActionsUI() {
    const visibleCheckboxes = document.querySelectorAll('.note-checkbox');
    const selectAllBtn = document.getElementById('selectAllNotes');
    const deleteSelectedBtn = document.getElementById('deleteSelectedNotes');
    
    if (selectAllBtn && visibleCheckboxes.length > 0) {
        const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        selectAllBtn.innerHTML = allChecked ? '⬜ Unselect all' : '✅ Select all';
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.innerHTML = `🗑️ Delete selected (${selectedNotes.size})`;
        deleteSelectedBtn.disabled = selectedNotes.size === 0;
        deleteSelectedBtn.style.opacity = selectedNotes.size === 0 ? '0.5' : '1';
    }
}

// ===== 5. HÀM XUẤT FILE CSV NÂNG CAO =====
function triggerExportModal() {
    if (notes.length === 0) {
        alert('No notes to export yet.');
        return;
    }
    
    const choice = prompt(
        "Choose CSV export style:\n\n" +
        "Type '1': export selected text and comment only\n" +
        "Type '2': export full note data (ID, selected text, comment, block, time)",
        "1"
    );
    
    if (choice === null) return; 
    
    let csvContent = '';
    
    if (choice.trim() === '1') {
        csvContent = 'Selected text,Comment\n';
        notes.forEach(n => {
            const rawText = `"${n.text.replace(/"/g, '""')}"`;
            const commentText = `"${(n.comment || '').replace(/"/g, '""')}"`;
            csvContent += `${rawText},${commentText}\n`;
        });
    } else if (choice.trim() === '2') {
        csvContent = 'ID,Selected text,Comment,Block,Created at\n';
        notes.forEach(n => {
            const rawText = `"${n.text.replace(/"/g, '""')}"`;
            const commentText = `"${(n.comment || '').replace(/"/g, '""')}"`;
            csvContent += `${n.id},${rawText},${commentText},${n.block},${n.time}\n`;
        });
    } else {
        alert('Invalid choice. Please try again.');
        return;
    }
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HanViet_Notes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== 6. NHÓM NOTES THEO ĐOẠN =====
function groupNotesByBlock() {
    const grouped = {};
    notes.forEach(n => {
        const key = n.block || 'Unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(n);
    });
    
    const container = document.getElementById('notesList');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(grouped).forEach(block => {
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'margin:1rem 0; padding:1rem; border:1px solid #f2dae0; border-radius:12px; background:#fffdfd;';
        groupDiv.innerHTML = `<h4 style="margin-bottom:0.8rem; color:#4d2d35; border-bottom:1px dashed #f2dae0; padding-bottom:0.4rem;">📍 Block ${block} (${grouped[block].length} note(s))</h4>`;
        
        grouped[block].forEach(note => {
            const item = createNoteItem(note);
            groupDiv.appendChild(item);
        });
        container.appendChild(groupDiv);
    });
}

// ===== 7. TẢI DỮ LIỆU TỰ ĐỘNG =====
function autoLoadSavedData() {
    if (activeDocName && docVault[activeDocName]) {
        parseDocumentCSV(docVault[activeDocName]);
        const docStatus = document.getElementById('docStatus');
        if (docStatus) docStatus.innerText = `✅ ${activeDocName}`;
    }
    if (activeTermName && termVault[activeTermName]) {
        parseTermCSV(termVault[activeTermName]);
        const termStatus = document.getElementById('termStatus');
        if (termStatus) termStatus.innerText = `✅ ${activeTermName}`;
    }
    if (activeQuizName && quizVault[activeQuizName]) {
        activeQuizSource = activeQuizSource || (activeQuizName === 'Vocabulary Quiz' ? 'vocab' : 'csv');
        parseQuizCSV(quizVault[activeQuizName].csvText);
        if (quizVault[activeQuizName].answers) {
            userAnswers = quizVault[activeQuizName].answers;
        }
        const quizStatus = document.getElementById('quizStatus');
        if (quizStatus) quizStatus.innerText = `✅ ${activeQuizName}`;
    }
    renderSidebarLists();
    updateQuizSourceStatus();
}

// ===== 8. RENDER SIDEBAR LISTS =====
function renderSidebarLists() {
    const docList = document.getElementById('historyDocsList');
    const termList = document.getElementById('historyTermsList');
    const quizList = document.getElementById('historyQuizList');
    const chapterList = document.getElementById('chapterLogList');
    
    if (chapterList) {
        chapterList.innerHTML = '';
        const visibleChapters = chapterLog.filter(entry => (entry.group || 'Chinese Culture') === activeCultureGroup);
        if (!visibleChapters.length) {
            chapterList.innerHTML = `<div class="history-item">No chapters in ${escapeHTML(activeCultureGroup)} yet</div>`;
        }
        visibleChapters.slice(0, 18).forEach(entry => {
            const item = document.createElement('div');
            item.className = `history-item chapter-item ${entry.name === activeDocName ? 'active-history' : ''}`;
            item.innerHTML = `<strong>${escapeHTML(entry.title)}</strong><span>${escapeHTML(entry.group || 'Chinese Culture')} · ${escapeHTML(entry.source)} · ${entry.blocks || 0} block(s)</span>`;
            item.addEventListener('click', () => {
                if (!docVault[entry.name]) return;
                activeDocName = entry.name;
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(docVault[entry.name]);
                renderSidebarLists();
                document.querySelector('[data-tab="tab-original"]')?.click();
                setStudyMode('reading');
            });
            chapterList.appendChild(item);
        });
    }
    
    if (docList) {
        docList.innerHTML = '';
        Object.keys(docVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeDocName ? 'active-history' : ''}`;
            item.textContent = `📄 ${name}`;
            item.addEventListener('click', () => {
                activeDocName = name;
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(docVault[name]);
                renderSidebarLists();
                const docStatus = document.getElementById('docStatus');
                if (docStatus) docStatus.innerText = `✅ ${name}`;
            });
            docList.appendChild(item);
        });
    }

    if (termList) {
        termList.innerHTML = '';
        Object.keys(termVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeTermName ? 'active-history' : ''}`;
            item.textContent = `📚 ${name}`;
            item.addEventListener('click', () => {
                activeTermName = name;
                localStorage.setItem('activeTermName_v5', activeTermName);
                parseTermCSV(termVault[name]);
                renderSidebarLists();
                const termStatus = document.getElementById('termStatus');
                if (termStatus) termStatus.innerText = `✅ ${name}`;
            });
            termList.appendChild(item);
        });
    }

    if (quizList) {
        quizList.innerHTML = '';
        Object.keys(quizVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeQuizName ? 'active-history' : ''}`;
            item.textContent = `📝 ${name}`;
            item.addEventListener('click', () => {
                if (activeQuizName && quizVault[activeQuizName]) {
                    quizVault[activeQuizName].answers = userAnswers;
                    localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                }
                activeQuizName = name;
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                activeQuizSource = name === 'Vocabulary Quiz' ? 'vocab' : 'csv';
                localStorage.setItem('activeQuizSource_v1', activeQuizSource);
                parseQuizCSV(quizVault[name].csvText);
                if (quizVault[name].answers) userAnswers = quizVault[name].answers;
                renderSidebarLists();
                const quizStatus = document.getElementById('quizStatus');
                if (quizStatus) quizStatus.innerText = `✅ ${name}`;
                const answerSection = document.getElementById('answer-section');
                if (answerSection) answerSection.style.display = 'none';
                renderQuizSection(0);
                updateQuizProgress();
                updateQuizSourceStatus();
            });
            quizList.appendChild(item);
        });
    }
}

function addChapterLog(name, source) {
    if (!name) return;
    const title = name.replace(/\.builder$|\.csv$/i, '');
    chapterLog = chapterLog.filter(entry => entry.name !== name);
    chapterLog.unshift({
        name,
        title,
        source,
        blocks: lessonBlocks.length,
        group: activeCultureGroup,
        createdAt: new Date().toISOString()
    });
    chapterLog = chapterLog.slice(0, 30);
    localStorage.setItem('cultureChapterLog_v1', JSON.stringify(chapterLog));
}

// ===== 9. PHÂN TÍCH CÚ PHÁP FILE CSV =====
function parseCSVLine(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const lines = clean.split(/\r\n|\n/);
    const delimiter = (lines[0] || '').includes('\t') ? '\t' : ',';
    return lines.map(line => {
        if (delimiter === '\t') return line.split('\t').map(cell => cell.trim());
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
}

function parseDocumentCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('originalContainer');
    
    if (!container) return;
    container.innerHTML = '';
    lessonBlocks = [];
    
    let blockCount = 0;
    let lastBlock = null;

    rows.forEach((row, idx) => {
        if (idx === 0 && row[0] && row[0].toLowerCase().includes('type')) return;
        
        const type = row[0] ? row[0].toLowerCase().trim() : 'p';
        const zh = row[1] ? row[1].trim() : '';
        const vi = row[2] ? row[2].trim() : '';

        if (type === 'h') {
            const heading = document.createElement('div');
            heading.style.marginTop = '2.2rem';
            heading.style.borderBottom = '1px dashed #dbb1bc';
            heading.innerHTML = `<h2 style="border:none; margin:0; padding:0; font-size:1.4rem;">${escapeHTML(zh)}</h2>
                                <p style="font-family:'American Typewriter', serif; color:#7d545e; font-size:1rem; font-style:italic; margin-top:0.2rem;">${escapeHTML(vi)}</p>`;
            container.appendChild(heading);
            lastBlock = null;
        } 
        else if (lastBlock && (zh === '' || zh === '|' || zh === lastBlock.querySelector('.zh').textContent.trim())) {
            if (vi !== '') {
                const viContainer = lastBlock.querySelector('.vi');
                if (viContainer) {
                    const textArea = viContainer.querySelector('.translation-input');
                    if (textArea) {
                        textArea.value = `${textArea.value}\n${vi}`.trim();
                        const idx = Number(lastBlock.dataset.index);
                        if (lessonBlocks[idx]) lessonBlocks[idx].vi = textArea.value;
                    }
                }
            }
        } 
        else {
            if (zh === '' && vi === '') return;
            lessonBlocks.push({ type: 'p', zh, vi });
            const block = document.createElement('div');
            block.className = 'bilingual-block';
            block.dataset.block = blockCount;
            block.dataset.index = blockCount;
            block.innerHTML = renderEditableBlockHTML(blockCount, zh, vi);
            container.appendChild(block);
            lastBlock = block;
            blockCount++;
        }
    });
    localStorage.setItem('simpleLessonBlocks_v1', JSON.stringify(lessonBlocks));
    console.log(`Loaded ${blockCount} lesson block(s).`);
}

function parseTermCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('termsContainer');
    if (!container) return;
    simpleTerms = [];
    
    container.innerHTML = '<div class="card">';
    const card = container.firstChild;
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        const zh = row[0] ? row[0].trim() : '';
        const vi = row[1] ? row[1].trim() : '';
        const pinyin = row[2] ? row[2].trim() : '';
        if (zh && vi) {
            simpleTerms.push({ id: Date.now() + '_' + idx, zh, vi, pinyin });
        }
    });
    localStorage.setItem('simpleTerms_v1', JSON.stringify(simpleTerms));
    renderSimpleTerms();
}

function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizBank = [];
    
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        if (row.length >= 6) {
            const correct = parseInt(row[5]);
            const finalCorrect = (!isNaN(correct) && correct >= 0 && correct <= 3) ? correct : 0;
            
            quizBank.push({
                id: `csv_${idx}_${row[0] || 'q'}`,
                zhQ: row[0] || 'Empty question',
                viQ: row[6] || 'Choose the best answer:',
                options: [row[1] || 'A', row[2] || 'B', row[3] || 'C', row[4] || 'D'],
                correct: finalCorrect
            });
        }
    });
    
    if (quizBank.length > 0) {
        localStorage.setItem('cultureQuizBank_v1', JSON.stringify(quizBank));
        startPracticeSet();
    }
}

function shuffleQuestions() {
    for (let i = quizQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizQuestions[i], quizQuestions[j]] = [quizQuestions[j], quizQuestions[i]];
    }
    quizQuestions.forEach((q, idx) => {
        q.displayId = idx + 1;
    });
}

function getQuizBankKey() {
    return activeQuizName || activeQuizSource || 'default';
}

function startPracticeSet() {
    const bank = quizBank.length ? quizBank : quizQuestions;
    if (!bank.length) return;
    const key = getQuizBankKey();
    const used = new Set(quizUsedIds[key] || []);
    let available = bank.filter(q => !used.has(String(q.id)));
    if (available.length < Math.min(questionsPerSet, bank.length)) {
        available = [...bank];
        quizUsedIds[key] = [];
        used.clear();
    }
    available.sort(() => Math.random() - 0.5);
    quizQuestions = available.slice(0, Math.min(questionsPerSet, available.length)).map(q => ({ ...q }));
    quizQuestions.forEach((q, idx) => {
        q.displayId = idx + 1;
        used.add(String(q.id));
    });
    quizUsedIds[key] = Array.from(used).slice(-Math.max(bank.length, questionsPerSet));
    localStorage.setItem('cultureQuizUsedIds_v1', JSON.stringify(quizUsedIds));
    userAnswers = new Array(quizQuestions.length).fill(null);
    currentQuizSection = 0;
    buildQuizNavigation();
    renderQuizSection(0);
    updateQuizProgress();
    updateQuizSourceStatus();
    saveQuizProgress();
}

// ===== 10. SIMPLE LESSON BUILDER: PASTE -> TRANSLATE -> VOCAB -> QUIZ -> AUDIO =====
function initSimpleLessonBuilder() {
    const buildBtn = document.getElementById('buildLessonBtn');
    const addVocabBtn = document.getElementById('addVocabBtn');
    const useSelectionBtn = document.getElementById('useSelectionVocabBtn');
    const generateQuizBtn = document.getElementById('generateQuizBtn');
    const speakAllBtn = document.getElementById('speakAllBtn');
    const stopSpeakBtn = document.getElementById('stopSpeakBtn');
    const exportLessonBtn = document.getElementById('exportLessonCsvBtn');
    const exportTermsBtn = document.getElementById('exportTermsCsvBtn');
    const sendPlannerBtn = document.getElementById('sendPlannerBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const generateQuizFromVocabBtn = document.getElementById('generateQuizFromVocabBtn');
    const uploadQuizCsvBtn = document.getElementById('uploadQuizCsvBtn');
    const translateAllBtn = document.getElementById('translateAllBtn');
    const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
    const clearGeminiKeyBtn = document.getElementById('clearGeminiKeyBtn');
    const copyGeminiPromptBtn = document.getElementById('copyGeminiPromptBtn');
    const toggleGeminiKeyBtn = document.getElementById('toggleGeminiKeyBtn');
    const applyLessonRepairBtn = document.getElementById('applyLessonRepairBtn');
    const deleteEmptyBlocksBtn = document.getElementById('deleteEmptyBlocksBtn');
    const closeLessonRepairBtn = document.getElementById('closeLessonRepairBtn');
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const geminiModelSelect = document.getElementById('geminiModel');
    const translationEngineSelect = document.getElementById('translationEngine');

    if (buildBtn) buildBtn.addEventListener('click', buildLessonFromPaste);
    if (addVocabBtn) addVocabBtn.addEventListener('click', addSimpleTerm);
    if (useSelectionBtn) useSelectionBtn.addEventListener('click', useSelectedTextForVocab);
    if (generateQuizBtn) generateQuizBtn.addEventListener('click', generateQuizFromTerms);
    if (speakAllBtn) speakAllBtn.addEventListener('click', () => speakChinese(getAllChineseText()));
    if (stopSpeakBtn) stopSpeakBtn.addEventListener('click', stopSpeech);
    if (exportLessonBtn) exportLessonBtn.addEventListener('click', exportSimpleLessonCSV);
    if (exportTermsBtn) exportTermsBtn.addEventListener('click', exportSimpleTermsCSV);
    if (sendPlannerBtn) sendPlannerBtn.addEventListener('click', sendPrepTaskToPlanner);
    if (voiceSelect) voiceSelect.addEventListener('change', () => localStorage.setItem('cultureVoiceURI', voiceSelect.value));
    if (generateQuizFromVocabBtn) generateQuizFromVocabBtn.addEventListener('click', generateQuizFromTerms);
    if (uploadQuizCsvBtn) uploadQuizCsvBtn.addEventListener('click', () => document.getElementById('csvQuizInput')?.click());
    if (translateAllBtn) translateAllBtn.addEventListener('click', translateAllBlocks);
    if (saveGeminiKeyBtn) saveGeminiKeyBtn.addEventListener('click', saveGeminiSettings);
    if (clearGeminiKeyBtn) clearGeminiKeyBtn.addEventListener('click', clearGeminiSettings);
    if (copyGeminiPromptBtn) copyGeminiPromptBtn.addEventListener('click', copyGeminiPromptForLesson);
    if (toggleGeminiKeyBtn) toggleGeminiKeyBtn.addEventListener('click', toggleGeminiKeyVisibility);
    if (applyLessonRepairBtn) applyLessonRepairBtn.addEventListener('click', applyLessonRepair);
    if (deleteEmptyBlocksBtn) deleteEmptyBlocksBtn.addEventListener('click', removeEmptyLessonBlocks);
    if (closeLessonRepairBtn) closeLessonRepairBtn.addEventListener('click', closeLessonRepairPanel);
    if (geminiApiKeyInput) geminiApiKeyInput.value = localStorage.getItem('cultureGeminiApiKey_v1') || '';
    if (geminiModelSelect) {
        const savedModel = localStorage.getItem('cultureGeminiModel_v1') || 'gemini-2.5-flash';
        geminiModelSelect.value = Array.from(geminiModelSelect.options).some(option => option.value === savedModel)
            ? savedModel
            : 'gemini-2.5-flash';
        geminiModelSelect.addEventListener('change', () => localStorage.setItem('cultureGeminiModel_v1', geminiModelSelect.value));
    }
    if (translationEngineSelect) {
        translationEngineSelect.value = localStorage.getItem('cultureTranslationEngine_v1') || 'gemini';
        translationEngineSelect.addEventListener('change', () => localStorage.setItem('cultureTranslationEngine_v1', translationEngineSelect.value));
    }

    initVoiceOptions();

    renderSimpleLesson();
    renderSimpleTerms();
    renderLessonPreview();
    updateQuizSourceStatus();
}

function splitChineseText(text) {
    const cleaned = String(text || '').replace(/\r/g, '').trim();
    if (!cleaned) return [];
    const paragraphBlocks = cleaned.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    if (paragraphBlocks.length > 1) return paragraphBlocks;
    return cleaned
        .replace(/([。！？!?])/g, '$1\n')
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
}

function buildLessonFromPaste() {
    const raw = document.getElementById('rawChineseInput')?.value || '';
    const title = document.getElementById('lessonTitleInput')?.value.trim() || `Lesson ${new Date().toLocaleDateString('vi-VN')}`;
    const blocks = splitChineseText(raw);
    if (!blocks.length) return alert('Paste Chinese text first.');

    lessonBlocks = blocks.map(zh => ({ type: 'p', zh, vi: '' }));
    localStorage.setItem('simpleLessonBlocks_v1', JSON.stringify(lessonBlocks));

    activeDocName = `${title}.builder`;
    localStorage.setItem('activeDocName_v5', activeDocName);
    docVault[activeDocName] = buildLessonCSV();
    localStorage.setItem('docVault_v5', JSON.stringify(docVault));
    addChapterLog(activeDocName, 'Built lesson');

    renderSimpleLesson();
    renderLessonPreview();
    updateBuildStatus(`Built ${lessonBlocks.length} study block(s). Scroll to Lesson Text or edit translations below.`);
    renderSidebarLists();
    document.querySelector('[data-tab="tab-original"]')?.click();
    document.getElementById('tab-original')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateBuildStatus(message) {
    const status = document.getElementById('buildStatus');
    if (status) status.textContent = message;
}

function saveLessonBlocks() {
    localStorage.setItem('simpleLessonBlocks_v1', JSON.stringify(lessonBlocks));
    if (activeDocName) {
        docVault[activeDocName] = buildLessonCSV();
        localStorage.setItem('docVault_v5', JSON.stringify(docVault));
    }
}

function renderLessonPreview() {
    const preview = document.getElementById('lessonPreview');
    if (!preview) return;
    if (!lessonBlocks.length) {
        preview.classList.remove('show');
        preview.innerHTML = '';
        return;
    }
    preview.classList.add('show');
    const shown = lessonBlocks.slice(0, 4);
    preview.innerHTML = `<div class="lesson-preview-title">Built lesson: ${lessonBlocks.length} block(s)</div>
        <div class="lesson-preview-list">
            ${shown.map((block, idx) => `<div class="lesson-preview-item"><strong>${idx + 1}.</strong> ${escapeHTML(block.zh)}</div>`).join('')}
        </div>
        <div class="lesson-preview-actions">
            <button type="button" class="btn-secondary" onclick="document.getElementById('tab-original').scrollIntoView({behavior:'smooth',block:'start'})">View Lesson Text</button>
            <button type="button" class="btn-secondary" onclick="speakChinese(getAllChineseText())">Read Built Lesson</button>
            <button type="button" class="btn-secondary" onclick="openLessonRepairPanel()">Edit Built Lesson</button>
        </div>`;
}

function openLessonRepairPanel() {
    const panel = document.getElementById('lessonRepairPanel');
    const input = document.getElementById('lessonRepairInput');
    if (!panel || !input) return;
    input.value = lessonBlocks.map(block => block.zh).join('\n');
    panel.classList.add('show');
    input.focus();
}

function closeLessonRepairPanel() {
    document.getElementById('lessonRepairPanel')?.classList.remove('show');
}

function applyLessonRepair() {
    const input = document.getElementById('lessonRepairInput');
    if (!input) return;
    const rebuilt = input.value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    if (!rebuilt.length) return alert('Add at least one lesson block.');
    const oldTranslations = lessonBlocks.map(block => block.vi || '');
    lessonBlocks = rebuilt.map((zh, idx) => ({
        type: 'p',
        zh,
        vi: oldTranslations[idx] || ''
    }));
    saveLessonBlocks();
    renderSimpleLesson();
    renderLessonPreview();
    closeLessonRepairPanel();
    updateBuildStatus(`Built lesson repaired: ${lessonBlocks.length} block(s).`);
    renderSidebarLists();
}

function removeEmptyLessonBlocks() {
    const before = lessonBlocks.length;
    lessonBlocks = lessonBlocks.filter(block => String(block.zh || '').trim() || String(block.vi || '').trim());
    saveLessonBlocks();
    renderSimpleLesson();
    renderLessonPreview();
    updateBuildStatus(`Removed ${before - lessonBlocks.length} empty block(s).`);
}

function renderEditableBlockHTML(index, zh, vi) {
    return `<div class="zh">
            <div>${escapeHTML(zh)}</div>
            <div class="block-tools">
                <button type="button" onclick="speakBlock(${index})">🔊 Read</button>
                <button type="button" onclick="translateBlock(${index})">Auto translate</button>
                <button type="button" onclick="copyBlockToVocab(${index})">Add vocab</button>
                <button type="button" onclick="deleteLessonBlock(${index})">Delete</button>
            </div>
        </div>
        <div class="vi">
            <textarea class="translation-input" data-index="${index}" placeholder="Translation / teacher notes">${escapeHTML(vi || '')}</textarea>
        </div>`;
}

function deleteLessonBlock(index) {
    if (!lessonBlocks[index]) return;
    if (!confirm(`Delete block ${index + 1}?`)) return;
    lessonBlocks.splice(index, 1);
    saveLessonBlocks();
    renderSimpleLesson();
    renderLessonPreview();
    updateBuildStatus(`Deleted block ${index + 1}. Built lesson now has ${lessonBlocks.length} block(s).`);
}

function renderSimpleLesson() {
    const container = document.getElementById('originalContainer');
    if (!container) return;
    if (!lessonBlocks.length) {
        container.innerHTML = '<p class="empty-message">📭 No lesson yet. Paste Chinese text above and click Build Lesson.</p>';
        renderLessonPreview();
        return;
    }
    container.innerHTML = '';
    lessonBlocks.forEach((block, index) => {
        const el = document.createElement('div');
        el.className = 'bilingual-block';
        el.dataset.block = index;
        el.dataset.index = index;
        el.innerHTML = renderEditableBlockHTML(index, block.zh, block.vi);
        container.appendChild(el);
    });
    container.querySelectorAll('.translation-input').forEach(input => {
        input.addEventListener('input', event => {
            const idx = Number(event.target.dataset.index);
            if (lessonBlocks[idx]) {
                lessonBlocks[idx].vi = event.target.value;
                saveLessonBlocks();
            }
        });
    });
    renderLessonPreview();
}

function getTranslationTarget() {
    return document.getElementById('translationTarget')?.value || 'vi';
}

function getTranslationEngine() {
    return document.getElementById('translationEngine')?.value || localStorage.getItem('cultureTranslationEngine_v1') || 'gemini';
}

function getGeminiLanguageName(targetLanguage) {
    return targetLanguage === 'en' ? 'English' : 'Vietnamese';
}

function saveGeminiSettings() {
    const key = document.getElementById('geminiApiKey')?.value.trim() || '';
    const model = document.getElementById('geminiModel')?.value || 'gemini-2.5-flash';
    if (!key) return alert('Paste your Gemini API key first.');
    localStorage.setItem('cultureGeminiApiKey_v1', key);
    localStorage.setItem('cultureGeminiModel_v1', model);
    updateBuildStatus('Gemini settings saved in this browser.');
}

function clearGeminiSettings() {
    localStorage.removeItem('cultureGeminiApiKey_v1');
    const input = document.getElementById('geminiApiKey');
    if (input) input.value = '';
    updateBuildStatus('Gemini API key cleared from this browser.');
}

function toggleGeminiKeyVisibility() {
    const input = document.getElementById('geminiApiKey');
    const button = document.getElementById('toggleGeminiKeyBtn');
    if (!input || !button) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
}

function buildGeminiPrompt(text, targetLanguage) {
    return `Translate the following Chinese study text into ${getGeminiLanguageName(targetLanguage)}.
Keep proper names, course labels, and HSK terms clear.
Return only the translation, without markdown or extra explanation.

Chinese text:
${text}`;
}

async function translateWithGemini(text, targetLanguage) {
    const key = localStorage.getItem('cultureGeminiApiKey_v1') || document.getElementById('geminiApiKey')?.value.trim() || '';
    if (!key) throw new Error('Missing Gemini API key.');
    const savedModel = localStorage.getItem('cultureGeminiModel_v1') || document.getElementById('geminiModel')?.value || 'gemini-2.5-flash';
    const allowedModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
    const model = allowedModels.includes(savedModel) ? savedModel : 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: buildGeminiPrompt(text, targetLanguage) }]
            }],
            generationConfig: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: 1024
            }
        })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(formatGeminiError(response.status, data?.error?.message));
    }
    const translated = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!translated) throw new Error('Gemini returned no translation.');
    return translated;
}

function formatGeminiError(status, message = '') {
    const lower = String(message || '').toLowerCase();
    if (status === 429 || lower.includes('quota') || lower.includes('too many')) {
        return 'Gemini API rate limit reached. Wait a bit, translate fewer blocks, switch to Copy Gemini prompt, or check Google AI Studio usage.';
    }
    if (status === 400 || lower.includes('api key')) {
        return 'Gemini API key problem. Check that the key is copied from Google AI Studio and saved in this browser.';
    }
    if (status === 401 || status === 403) {
        return 'Gemini API access denied. Check the API key, project permissions, and billing/API access in Google AI Studio.';
    }
    if (status >= 500) {
        return 'Gemini service is temporarily unavailable. Try again later or use Copy Gemini prompt.';
    }
    return message || 'Gemini translation failed.';
}

async function copyGeminiPromptForLesson() {
    const target = getTranslationTarget();
    const text = getAllChineseText();
    if (!text.trim()) return alert('Build a lesson first.');
    const prompt = buildGeminiPrompt(text, target);
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
        updateBuildStatus('Gemini prompt copied. Paste it into Gemini if you prefer web translation.');
    } else {
        window.prompt('Copy this Gemini prompt:', prompt);
    }
}

async function translateWithBrowserAPI(text, targetLanguage) {
    const translatorFactory = window.Translator || window.ai?.translator;
    if (!translatorFactory?.create) return '';
    const translator = await translatorFactory.create({
        sourceLanguage: 'zh',
        targetLanguage
    });
    if (!translator?.translate) return '';
    return translator.translate(text);
}

async function translateWithOnlineFallback(text, targetLanguage) {
    const langPair = `zh-CN|${targetLanguage}`;
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Translation service failed.');
    const data = await response.json();
    return data?.responseData?.translatedText || '';
}

async function autoTranslateText(text, targetLanguage) {
    const clean = String(text || '').trim();
    if (!clean) return '';
    const engine = getTranslationEngine();
    if (engine === 'gemini') return translateWithGemini(clean, targetLanguage);
    if (engine === 'browser') {
        try {
            const browserResult = await translateWithBrowserAPI(clean, targetLanguage);
            if (browserResult) return browserResult;
        } catch (error) {
            console.warn('Browser translation unavailable:', error);
        }
    }
    return translateWithOnlineFallback(clean, targetLanguage);
}

async function translateBlock(index, showStatus = true) {
    const block = lessonBlocks[index];
    if (!block) return;
    const target = getTranslationTarget();
    if (showStatus) updateBuildStatus(`Translating block ${index + 1} to ${target === 'vi' ? 'Vietnamese' : 'English'}...`);
    try {
        const translated = await autoTranslateText(block.zh, target);
        if (!translated) throw new Error('No translation returned.');
        block.vi = translated;
        const input = document.querySelector(`.translation-input[data-index="${index}"]`);
        if (input) input.value = translated;
        saveLessonBlocks();
        if (showStatus) updateBuildStatus(`Translated block ${index + 1}. You can edit it in the right column.`);
    } catch (error) {
        console.error(error);
        if (showStatus) {
            updateBuildStatus(`${error.message || 'Auto translation failed'} You can still paste/edit translation manually.`);
        } else {
            throw error;
        }
    }
}

async function translateAllBlocks() {
    if (!lessonBlocks.length) return alert('Build a lesson first.');
    const target = getTranslationTarget();
    const button = document.getElementById('translateAllBtn');
    if (button) button.disabled = true;
    try {
        for (let i = 0; i < lessonBlocks.length; i++) {
            updateBuildStatus(`Translating ${i + 1}/${lessonBlocks.length} to ${target === 'vi' ? 'Vietnamese' : 'English'}...`);
            await translateBlock(i, false);
        }
        updateBuildStatus(`Auto translation finished. Review and edit the ${target === 'vi' ? 'Vietnamese' : 'English'} column.`);
    } catch (error) {
        console.error(error);
        updateBuildStatus(`${error.message || 'Auto translation stopped'} Existing translations are saved and editable.`);
    } finally {
        if (button) button.disabled = false;
    }
}

function copyBlockToVocab(index) {
    const block = lessonBlocks[index];
    if (!block) return;
    document.getElementById('termZhInput').value = block.zh;
    document.getElementById('termViInput').focus();
}

function speakBlock(index) {
    const block = lessonBlocks[index];
    if (block) speakChinese(block.zh);
}

function useSelectedTextForVocab() {
    const selected = window.getSelection().toString().trim();
    if (!selected) return alert('Select Chinese text first.');
    document.getElementById('termZhInput').value = selected;
    document.getElementById('termViInput').focus();
}

function addSimpleTerm() {
    const zhInput = document.getElementById('termZhInput');
    const viInput = document.getElementById('termViInput');
    const pinyinInput = document.getElementById('termPinyinInput');
    const zh = zhInput.value.trim();
    const vi = viInput.value.trim();
    const pinyin = pinyinInput.value.trim();
    if (!zh || !vi) return alert('Add Chinese and Vietnamese meaning.');
    simpleTerms.unshift({ id: Date.now() + '_term', zh, vi, pinyin });
    localStorage.setItem('simpleTerms_v1', JSON.stringify(simpleTerms));
    zhInput.value = '';
    viInput.value = '';
    pinyinInput.value = '';
    renderSimpleTerms();
}

function renderSimpleTerms() {
    const container = document.getElementById('termsContainer');
    if (!container) return;
    if (!simpleTerms.length) {
        container.innerHTML = '<p class="empty-message">📭 Add vocabulary from selected text or import terms.csv.</p>';
        return;
    }
    container.innerHTML = '<div class="card"></div>';
    const card = container.firstChild;
    simpleTerms.forEach(term => {
        const row = document.createElement('div');
        row.className = 'term-card';
        row.innerHTML = `<span class="term-zh">📌 ${escapeHTML(term.zh)} ${term.pinyin ? `<small>(${escapeHTML(term.pinyin)})</small>` : ''}</span>
            <span class="term-vi">${escapeHTML(term.vi)}</span>`;
        card.appendChild(row);
    });
}

function generateQuizFromTerms() {
    if (simpleTerms.length < 2) return alert('Add at least 2 vocabulary items first.');
    quizBank = simpleTerms.map((term, idx) => {
        const wrong = simpleTerms.filter(t => t.id !== term.id).map(t => t.vi).sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [term.vi, ...wrong];
        while (options.length < 4) options.push('Review again');
        const shuffled = options.sort(() => Math.random() - 0.5);
        return {
            id: `vocab_${term.id || idx}`,
            zhQ: `What does “${term.zh}” mean?`,
            viQ: term.pinyin ? `Pinyin: ${term.pinyin}` : 'Choose the correct meaning.',
            options: shuffled,
            correct: shuffled.indexOf(term.vi)
        };
    });
    activeQuizName = 'Vocabulary Quiz';
    activeQuizSource = 'vocab';
    localStorage.setItem('cultureQuizBank_v1', JSON.stringify(quizBank));
    startPracticeSet();
    quizVault[activeQuizName] = { csvText: buildQuizCSVFromQuestions(quizBank), answers: userAnswers };
    localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
    localStorage.setItem('activeQuizName_v5', activeQuizName);
    localStorage.setItem('activeQuizSource_v1', activeQuizSource);
    renderSidebarLists();
    document.querySelector('[data-tab="tab-quiz"]')?.click();
}

function updateQuizSourceStatus() {
    const el = document.getElementById('quizSourceStatus');
    if (!el) return;
    if (!quizQuestions.length) {
        el.textContent = 'No active quiz yet.';
    } else if (activeQuizSource === 'vocab') {
        el.textContent = `Test bank: generated from vocabulary (${quizBank.length} total). Current set: ${quizQuestions.length}.`;
    } else if (activeQuizSource === 'csv') {
        el.textContent = `Test bank: uploaded MCQ CSV${activeQuizName ? ` - ${activeQuizName}` : ''} (${quizBank.length} total). Current set: ${quizQuestions.length}.`;
    } else {
        el.textContent = `Active quiz: ${quizQuestions.length} question(s).`;
    }
}

function getAllChineseText() {
    return lessonBlocks.map(block => block.zh).join('\n');
}

function splitSpeechUnits(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/([。！？!?；;])/g, '$1|')
        .split('|')
        .map(unit => unit.trim())
        .filter(Boolean);
}

function getSelectedChineseVoice() {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoiceURI = document.getElementById('voiceSelect')?.value || localStorage.getItem('cultureVoiceURI') || '';
    const preferredNames = /ting-ting|sin-ji|xiaoxiao|xiaoyi|mei-jia|meijia|li-mu|yuna|mandarin|chinese/i;
    return voices.find(v => v.voiceURI === selectedVoiceURI)
        || voices.find(v => /^zh-CN/i.test(v.lang) && preferredNames.test(v.name))
        || voices.find(v => /^zh/i.test(v.lang) && preferredNames.test(v.name))
        || voices.find(v => /^zh-CN/i.test(v.lang))
        || voices.find(v => /^zh/i.test(v.lang));
}

function makeUtterance(text, rateMultiplier = 1) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = Math.max(0.5, Math.min(2, Number(document.getElementById('speechRate')?.value || 1) * rateMultiplier));
    utterance.pitch = Number(document.getElementById('speechPitch')?.value || 1);
    const voice = getSelectedChineseVoice();
    if (voice) utterance.voice = voice;
    return utterance;
}

function speakChinese(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    if (!('speechSynthesis' in window)) return alert('Text-to-speech is not available in this browser.');
    window.speechSynthesis.cancel();
    const mode = document.getElementById('speechMode')?.value || 'sentence';
    const units = splitSpeechUnits(clean);

    if (mode === 'continuous' || units.length <= 1) {
        window.speechSynthesis.speak(makeUtterance(clean));
        return;
    }

    units.forEach(unit => {
        if (mode === 'repeat') {
            window.speechSynthesis.speak(makeUtterance(unit, 0.95));
            window.speechSynthesis.speak(makeUtterance(unit, 0.75));
        } else if (mode === 'shadow') {
            window.speechSynthesis.speak(makeUtterance(unit, 0.7));
            window.speechSynthesis.speak(makeUtterance(unit, 0.9));
        } else {
            window.speechSynthesis.speak(makeUtterance(unit));
        }
    });
}

function initVoiceOptions() {
    const select = document.getElementById('voiceSelect');
    if (!select || !('speechSynthesis' in window)) return;
    const saved = localStorage.getItem('cultureVoiceURI') || '';
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const chineseVoices = voices
            .filter(v => /^zh/i.test(v.lang) || /Chinese|Mandarin|Cantonese|Ting|Xiao|Mei/i.test(v.name))
            .sort((a, b) => String(a.lang).localeCompare(String(b.lang)) || String(a.name).localeCompare(String(b.name)));
        select.innerHTML = '<option value="">Auto best Chinese voice</option>' + chineseVoices.map(v =>
            `<option value="${escapeHTML(v.voiceURI)}">${escapeHTML(v.name)} (${escapeHTML(v.lang)})</option>`
        ).join('');
        select.value = chineseVoices.some(v => v.voiceURI === saved) ? saved : '';
        if (!chineseVoices.length) {
            select.innerHTML = '<option value="">No Chinese voice found</option>';
        }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildLessonCSV() {
    return ['type,zhongwen,tiengviet']
        .concat(lessonBlocks.map(block => ['p', csvCell(block.zh), csvCell(block.vi)].join(',')))
        .join('\n');
}

function buildQuizCSVFromQuestions(sourceQuestions = quizQuestions) {
    return ['question,A,B,C,D,correct,hint']
        .concat(sourceQuestions.map(q => [csvCell(q.zhQ), ...q.options.map(csvCell), q.correct, csvCell(q.viQ)].join(',')))
        .join('\n');
}

function exportSimpleLessonCSV() {
    if (!lessonBlocks.length) return alert('Build a lesson first.');
    downloadTextFile(buildLessonCSV(), `lesson_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

function exportSimpleTermsCSV() {
    if (!simpleTerms.length) return alert('Add vocabulary first.');
    const csv = ['zhongwen,tiengviet,pinyin']
        .concat(simpleTerms.map(t => [csvCell(t.zh), csvCell(t.vi), csvCell(t.pinyin)].join(',')))
        .join('\n');
    downloadTextFile(csv, `terms_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

function downloadTextFile(text, filename, type) {
    const blob = new Blob(['\uFEFF' + text], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function sendPrepTaskToPlanner() {
    const title = document.getElementById('lessonTitleInput')?.value.trim() || activeDocName || 'Chinese Culture lesson';
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const planner = JSON.parse(localStorage.getItem('plannerData') || '{"tasks":[]}');
    planner.tasks = Array.isArray(planner.tasks) ? planner.tasks : [];
    planner.tasks.push({
        id: Date.now() + '_culture',
        title: `Prepare: ${title}`,
        category: 'Chinese Culture',
        status: 'todo',
        desc: 'From Chinese Culture module',
        date
    });
    localStorage.setItem('plannerData', JSON.stringify(planner));
    alert('Prep task added to Planner.');
}

// ===== 10. SỬA LỖI ĐỊNH VỊ POPUP TUYỆT ĐỐI THEO CHUỘT (CHỐNG LỆCH ĐOẠN / ZOOM 80%) =====
function initHighlightSystem() {
    const popup = document.getElementById('notePopup');
    if (!popup) return;

    let isPopupOpen = false;
    let selectedColor = 'yellow'; 

    const colorSpans = document.querySelectorAll('#colorOptions span');
    colorSpans.forEach(span => {
        span.addEventListener('click', function() {
            colorSpans.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            selectedColor = this.dataset.color; 
        });
    });

    function showPopup(text, blockIdx, rect, parentBlock) {
        const preview = document.getElementById('selectedTextPreview');
        if (preview) preview.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        
        const blockInfo = document.getElementById('selectedBlockInfo');
        if (blockInfo) blockInfo.textContent = `Block: ${blockIdx}`;

        const textarea = document.getElementById('noteContent');
        if (textarea) textarea.value = '';

        colorSpans.forEach(s => s.classList.remove('active'));
        const defaultSpan = document.querySelector('#colorOptions span[data-color="yellow"]');
        if (defaultSpan) defaultSpan.classList.add('active');
        selectedColor = 'yellow';

        // Lấy bounding box của container chính làm điểm mốc tính toán
        const tabOriginal = document.getElementById('tab-original');
        const tabRect = tabOriginal.getBoundingClientRect();

        if (parentBlock) {
            const blockRect = parentBlock.getBoundingClientRect();
            
            // FIX TRIỆT ĐỂ: Tính tọa độ Left và Top dựa trên vị trí chính xác của khối text so với khung cha
            let left = blockRect.right - tabRect.left + 35;
            let top = blockRect.top - tabRect.top;

            const popupWidth = 340;
            // Nếu thu hẹp màn hình hoặc bị tràn cạnh phải do zoom, lật popup xuống dưới chân chữ bôi đen
            if (left + popupWidth > tabRect.width) {
                left = Math.max(10, rect.left - tabRect.left);
                top = rect.bottom - tabRect.top + 10;
            }

            popup.style.display = 'block';
            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
        }

        isPopupOpen = true;
        isPopupVisible = true;
        selectedText = text;
        selectedBlock = blockIdx;

        setTimeout(() => { if (textarea) textarea.focus(); }, 100);
    }

    function hidePopup() {
        popup.style.display = 'none';
        isPopupOpen = false;
        isPopupVisible = false;
    }

    document.addEventListener('mouseup', function(e) {
        if (popup.contains(e.target)) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length < 2) {
            hidePopup();
            return;
        }

        const tabOriginal = document.getElementById('tab-original');
        if (!tabOriginal || !tabOriginal.classList.contains('active')) return;

        const container = document.getElementById('originalContainer');
        if (!container || !container.contains(selection.anchorNode)) {
            hidePopup();
            return;
        }

        let blockIdx = 'N/A';
        let parentBlock = null;
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== document.body) {
            if (parent.classList && parent.classList.contains('bilingual-block')) {
                blockIdx = parent.dataset.block || parent.dataset.index || 'N/A';
                parentBlock = parent;
                break;
            }
            parent = parent.parentNode;
        }

        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showPopup(text, blockIdx, rect, parentBlock);
    });

    document.addEventListener('mousedown', function(e) {
        if (isPopupOpen && !popup.contains(e.target)) {
            const sel = window.getSelection();
            if (!sel.toString().trim()) hidePopup();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (isPopupOpen && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveNote();
        }
        if (e.key === 'Escape' && isPopupOpen) hidePopup();
    });

    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    }

    function saveNote() {
        if (!selectedText) return;

        const textarea = document.getElementById('noteContent');
        const comment = textarea ? textarea.value.trim() : '';

        notes.push({
            id: Date.now(),
            text: selectedText,
            comment: comment || '(No comment)',
            color: selectedColor,
            block: selectedBlock,
            time: new Date().toLocaleString('vi-VN')
        });

        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        hidePopup();
        window.getSelection().removeAllRanges();
        
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#e3a6b2; color:white; padding:12px 24px; border-radius:8px; font-weight:bold; z-index:100000;';
        toast.textContent = '✅ Note saved!';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 1500);

        if (document.getElementById('tab-notes').classList.contains('active')) {
            renderNotes();
        }
    }

    const cancelBtn = document.getElementById('cancelPopupBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hidePopup);

    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) closeBtn.addEventListener('click', hidePopup);
}

// ===== 11. RENDER NOTES & ĐỒNG BỘ MÀU NỀN PASTEL CHUẨN =====
function createNoteItem(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    
    const colorMap = {
        'yellow': '#fffdf2',
        'green': '#f3faf5',
        'blue': '#f2f8fd',
        'pink': '#fff5f7'
    };
    const colorBorderMap = {
        'yellow': '#f2dae0',
        'green': '#c3ebd0',
        'blue': '#cce3f7',
        'pink': '#f7cbd6'
    };
    
    const bgColor = colorMap[note.color] || '#fffcfd';
    const borderColor = colorBorderMap[note.color] || '#f2dae0';
    
    let baseStyle = `position:relative; padding:1rem; padding-right:2.5rem; margin:0.5rem 0; border:1px solid ${borderColor}; border-radius:8px; background:${bgColor};`;
    div.style.cssText = baseStyle;
    
    const isChecked = selectedNotes.has(note.id) ? 'checked' : '';
    const deleteButtonHTML = `<button onclick="deleteNote(${note.id})" style="position:absolute; top:0.8rem; right:0.6rem; background:none; border:none; color:#bd4f60; cursor:pointer; font-size:1.1rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Delete note">🗑️</button>`;
    
    let content = '';
    switch(currentNoteView) {
        case 'grid':
            div.style.cssText += 'display:inline-block; width:calc(33.33% - 1rem); margin:0.5rem; vertical-align:top;';
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0; word-wrap: break-word;">
                        <div style="font-style:italic; border-left:3px solid #e3a6b2; padding-left:0.5rem; color:#4d2d35;">"${note.text}"</div>
                        <div style="font-size:0.85rem; color:#8c6870; margin-top:0.4rem;">💬 ${note.comment || 'Empty'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.4rem; color:#a6828a;">📍 Block: ${note.block} | ${note.time}</div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'list':
            content = `
                <div style="display:flex; align-items:center; gap:1rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" ${isChecked}>
                    <div style="flex:1; min-width:0; display:flex; align-items:center; gap:0.5rem; justify-content:space-between;">
                        <span style="font-weight:500; color:#4d2d35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50%;">"${note.text}"</span>
                        <span style="font-size:0.85rem; color:#8c6870; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-left:0.5rem;">— ${note.comment || 'Empty'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#8c6870; min-width:50px;">📍 ${note.block}</div>
                    <div style="font-size:0.75rem; color:#8c6870; min-width:130px; text-align:right;">${note.time}</div>
                    <div style="min-width:30px; position:relative;"></div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'original':
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0;">
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic; color:#4d2d35;">"${note.text}"</div>
                        <div style="margin-top:0.4rem; font-size:0.9rem; color:#5c3a42;">💬 ${note.comment || 'Empty'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.3rem; color:#a6828a;">📍 Block: ${note.block} | ${note.time}</div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'detailed':
        default:
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:bold; color:#4d2d35; margin-bottom:0.2rem;">📝 Selected text:</div>
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic; color:#4d2d35;">"${note.text}"</div>
                        <div style="margin-top:0.5rem; color:#2b1a1d;"><strong>💬 Comment:</strong> ${note.comment || 'Empty'}</div>
                        <div style="margin-top:0.4rem; display:flex; gap:1rem; font-size:0.8rem; color:#8c6870;">
                            <span>📍 Block: ${note.block}</span>
                            <span>🕐 Time: ${note.time}</span>
                        </div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
    }
    
    div.innerHTML = content;
    
    const cb = div.querySelector('.note-checkbox');
    if (cb) {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedNotes.add(note.id);
            } else {
                selectedNotes.delete(note.id);
            }
            updateBulkActionsUI();
        });
    }
    
    return div;
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<p class="empty-message">📭 No saved notes yet.</p>';
        return;
    }
    
    container.innerHTML = '';
    const sortedNotes = [...notes].reverse();
    
    sortedNotes.forEach(note => {
        const item = createNoteItem(note);
        container.appendChild(item);
    });
    
    updateBulkActionsUI();
}

window.deleteNote = function(id) {
    if (confirm('Delete this note?')) {
        notes = notes.filter(n => n.id !== id);
        selectedNotes.delete(id); 
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        renderNotes();
    }
};

// ===== 12. TRÌNH KIỂM TRA TRẮC NGHIỆM (QUIZ ENGINE) =====
function initQuizEngine() {
    const checkBtn = document.getElementById('checkAnswersBtn');
    if (checkBtn) checkBtn.addEventListener('click', submitQuizScore);

    const resetBtn = document.getElementById('resetQuizBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            userAnswers.fill(null);
            const answerSection = document.getElementById('answer-section');
            if (answerSection) answerSection.style.display = 'none';
            renderQuizSection(currentQuizSection);
            updateQuizProgress();
            saveQuizProgress();
        });
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            if (!quizBank.length && !quizQuestions.length) return;
            const answerSection = document.getElementById('answer-section');
            if (answerSection) answerSection.style.display = 'none';
            startPracticeSet();
        });
    }

    const resetStatsBtn = document.getElementById('resetStatsBtn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', function() {
            scoreHistory = [];
            localStorage.removeItem('quizScoreHistory_v5');
            renderQuizChart();
        });
    }
    renderQuizChart();
}

function buildQuizNavigation() {
    const nav = document.getElementById('quizSectionNav');
    if (!nav) return;
    const bankTotal = quizBank.length || quizQuestions.length;
    const usedTotal = (quizUsedIds[getQuizBankKey()] || []).length;
    nav.innerHTML = bankTotal
        ? `<span class="quiz-bank-note">Random 10-question practice. Used ${Math.min(usedTotal, bankTotal)}/${bankTotal}; repeats reset after the bank is finished.</span>`
        : '';
}

function renderQuizSection(sectionIdx) {
    currentQuizSection = sectionIdx;
    const container = document.getElementById('quizContainer');
    if (!container) return;
    
    if (quizQuestions.length === 0) {
        container.innerHTML = '<p class="empty-message">📝 Add vocabulary and generate a quiz, or import quiz.csv.</p>';
        return;
    }
    container.innerHTML = '';

    for (let i = 0; i < quizQuestions.length; i++) {
        const q = quizQuestions[i];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        
        const displayNum = q.displayId || (i + 1);
        item.innerHTML = `
            <p class="quiz-question"><strong>Question ${displayNum}:</strong> ${q.zhQ}</p>
            <p style="color:#8c5863; font-size:0.9rem; font-style:italic; margin-bottom:0.5rem;">${q.viQ}</p>
        `;
        
        const list = document.createElement('ul');
        list.className = 'quiz-options';
        const labels = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li');
            li.textContent = `${labels[optIdx]}. ${opt}`;
            if (userAnswers[i] === optIdx) li.className = 'selected';
            li.addEventListener('click', function() {
                const answerSection = document.getElementById('answer-section');
                if (answerSection && answerSection.style.display === 'block') return;
                userAnswers[i] = optIdx;
                saveQuizProgress();
                renderQuizSection(currentQuizSection);
                updateQuizProgress();
            });
            list.appendChild(li);
        });
        item.appendChild(list);
        container.appendChild(item);
    }

    const answerSection = document.getElementById('answer-section');
    if (answerSection && answerSection.style.display === 'block') {
        revealAnswers();
    }
}

function saveQuizProgress() {
    if (activeQuizName && quizVault[activeQuizName]) {
        quizVault[activeQuizName].answers = userAnswers;
        localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
    }
}

function updateQuizProgress() {
    const el = document.getElementById('quizProgress');
    if (!el) return;
    const answered = userAnswers.filter(a => a !== null).length;
    el.textContent = `✅ ${answered}/${quizQuestions.length}`;
}

function submitQuizScore() {
    if (quizQuestions.length === 0) return;
    
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`You still have ${unanswered} unanswered question(s). Check answers anyway?`)) {
        return;
    }
    
    let score = 0;
    const list = document.getElementById('answers-list');
    list.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.correct;
        if (isCorrect) score++;
        const status = isCorrect ? '✅ Correct' : '❌ Wrong';
        const correctAnswer = q.options[q.correct];
        const displayNum = q.displayId || (idx + 1);
        
        const div = document.createElement('div');
        div.style.cssText = `padding:0.3rem 0; border-bottom:1px solid #f2dae0; ${isCorrect ? 'color:#1e421e;' : 'color:#6e201d;'}`;
        div.innerHTML = `<strong>Question ${displayNum}:</strong> ${status}`;
        
        if (!isCorrect) {
            div.innerHTML += `<span style="font-size:0.8rem; color:#8c5863;"> (Correct answer: ${correctAnswer})</span>`;
        }
        list.appendChild(div);
    });

    const percent = Math.round((score / quizQuestions.length) * 100);
    const answerSection = document.getElementById('answer-section');
    if (answerSection) answerSection.style.display = 'block';
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-weight:bold; font-size:1.2rem; text-align:center; padding:0.5rem; background:#fae1e6; border-radius:6px; margin-bottom:0.5rem;';
    scoreDisplay.textContent = `📊 Score: ${score}/${quizQuestions.length} (${percent}%)`;
    list.prepend(scoreDisplay);
    
    scoreHistory.push(percent);
    if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v5', JSON.stringify(scoreHistory));
    renderQuizChart();
    revealAnswers();
}

function revealAnswers() {
    const container = document.getElementById('quizContainer');
    if (!container) return;
    
    const items = container.querySelectorAll('.quiz-item');
    items.forEach((item, idx) => {
        const actualIdx = idx;
        const q = quizQuestions[actualIdx];
        if (!q) return;
        
        const options = item.querySelectorAll('.quiz-options li');
        options.forEach((li, optIdx) => {
            const optText = li.textContent.replace(/^[A-D]\.\s*/, '');
            let matchingIdx = -1;
            q.options.forEach((opt, i) => {
                if (opt === optText) matchingIdx = i;
            });
            
            if (matchingIdx === q.correct) {
                li.className = 'correct-answer';
            } else if (userAnswers[actualIdx] === matchingIdx && matchingIdx !== q.correct) {
                li.className = 'wrong-answer';
            }
        });
    });
}

// ===== 13. BIỂU ĐỒ TIẾN ĐỘ =====
function renderQuizChart() {
    const rows = document.getElementById('chartRows');
    if (!rows) return;
    rows.innerHTML = '';
    
    if (scoreHistory.length === 0) {
        rows.innerHTML = '<p style="font-size:0.88rem; font-style:italic;">📊 No score data yet</p>';
        return;
    }
    
    let sum = 0;
    scoreHistory.forEach((score, idx) => {
        sum += score;
        const row = document.createElement('div');
        row.className = 'chart-row';
        row.innerHTML = `
            <span class="chart-label">Try ${idx + 1}</span>
            <div class="chart-bar">
                <div class="chart-bar-fill" style="width: ${score}%"></div>
            </div>
            <span class="chart-value">${score}</span>
        `;
        rows.appendChild(row);
    });
    
    const avgEl = document.getElementById('avgScoreDisplay');
    if (avgEl) {
        avgEl.textContent = `📊 Average: ${Math.round(sum / scoreHistory.length)}/100`;
    }
}

console.log('Chinese Culture Study Studio is ready.');
