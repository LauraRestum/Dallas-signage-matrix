const toc = document.getElementById('toc');
const content = document.getElementById('content');
const contentStatus = document.getElementById('content-status');
const modal = document.getElementById('image-modal');
const modalTitle = document.getElementById('modal-title');
const modalImage = document.getElementById('modal-image');
const modalPdf = document.getElementById('modal-pdf');
const closeButton = document.getElementById('modal-close');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchStatus = document.getElementById('search-status');
const navToggle = document.getElementById('nav-toggle');
const sidebar = document.querySelector('.sidebar');

let lastFocusedBeforeModal = null;
let groupButtonsRef = [];
let itemButtonsRef = [];
let tileNodesRef = [];
let sectionNodesRef = [];

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const makeFallbackSrc = (label, width = 1200, height = 700) => {
  const safeLabel = String(label ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><rect width='100%' height='100%' fill='#f5f7fa'/><text x='50%' y='47%' dominant-baseline='middle' text-anchor='middle' fill='#022855' font-family='Montserrat, Arial, sans-serif' font-size='48'>Preview unavailable</text><text x='50%' y='57%' dominant-baseline='middle' text-anchor='middle' fill='#546171' font-family='Montserrat, Arial, sans-serif' font-size='30'>${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const isPdfPath = (path) => String(path ?? '').toLowerCase().endsWith('.pdf');
const isPowerPointPlaceholder = (categoryTitle, itemName) =>
  categoryTitle === 'Digital items' && String(itemName ?? '').toLowerCase() === 'powerpoint';
const hasDownloadFiles = (files) => Array.isArray(files) && files.length > 0;
const hasCustomDownload = (item) => Boolean(item?.downloadFile);

const filenameFromPath = (path) => String(path ?? '').split('/').pop()?.split('?')[0] || 'download';

const triggerFileDownload = async (href) => {
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Failed to download ${href}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = objectUrl;
  downloadLink.download = filenameFromPath(href);
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const triggerFileBatchDownload = async (files) => {
  const failures = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      // eslint-disable-next-line no-await-in-loop
      await triggerFileDownload(file);
    } catch (error) {
      console.error(error);
      failures.push(file);
    }

    if (index < files.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }
  }
  return failures;
};

const withPdfPage = (path, page) => {
  if (!isPdfPath(path)) return path;

  const [rawPath] = String(path).split('#');
  const [basePath, existingQuery = ''] = rawPath.split('?');
  const queryParams = new URLSearchParams(existingQuery);
  const fragmentParams = new URLSearchParams();

  if (page) {
    const pageValue = String(page);
    queryParams.set('signagePage', pageValue);
    fragmentParams.set('page', pageValue);
  }

  fragmentParams.set('view', 'FitH');
  fragmentParams.set('toolbar', '0');
  fragmentParams.set('navpanes', '0');

  const query = queryParams.toString();
  return `${basePath}${query ? `?${query}` : ''}#${fragmentParams.toString()}`;
};

/* ----------------------------- Modal / focus trap ----------------------------- */

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

const getFocusable = (root) =>
  Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );

const handleModalKeydown = (event) => {
  if (event.key === 'Escape') {
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = getFocusable(modal);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const openModal = (src, altText, mediaType = 'image') => {
  const isPdf = mediaType === 'pdf';
  lastFocusedBeforeModal = document.activeElement;

  modalTitle.textContent = altText || 'Signage preview';
  modalImage.style.display = isPdf ? 'none' : 'block';
  modalPdf.style.display = isPdf ? 'block' : 'none';

  if (isPdf) {
    modalPdf.src = src;
    modalPdf.title = `${altText || 'Signage'} PDF preview`;
    modalImage.src = '';
    modalImage.alt = '';
  } else {
    modalImage.src = src;
    modalImage.alt = altText || '';
    modalPdf.src = '';
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', handleModalKeydown);
  // Focus close button after paint so the dialog reads cleanly to AT.
  requestAnimationFrame(() => closeButton.focus());
};

const closeModal = () => {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modalImage.src = '';
  modalImage.alt = '';
  modalPdf.src = '';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleModalKeydown);
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
  }
  lastFocusedBeforeModal = null;
};

/* ----------------------------- Sidebar scroll-spy ----------------------------- */

const isWithinViewport = (element, container) => {
  if (!element || !container) return false;
  const elRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
};

const gentleScrollIntoView = (element, container) => {
  if (!element || !container) return;
  if (isWithinViewport(element, container)) return;
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
};

/* ----------------------------- Search / filter ----------------------------- */

const normalise = (text) => String(text ?? '').toLowerCase().trim();

const applyFilter = (rawQuery) => {
  const query = normalise(rawQuery);
  const hasQuery = query.length > 0;
  searchClear.hidden = !hasQuery;

  let matchingTiles = 0;
  const sectionMatchCounts = new Map();

  tileNodesRef.forEach(({ figure, item, categoryTitle }) => {
    const haystack = `${item.name} ${categoryTitle} ${item.details || ''}`.toLowerCase();
    const matches = !hasQuery || haystack.includes(query);
    figure.hidden = !matches;
    if (matches) {
      matchingTiles += 1;
      sectionMatchCounts.set(figure.dataset.sectionId, (sectionMatchCounts.get(figure.dataset.sectionId) || 0) + 1);
    }
  });

  sectionNodesRef.forEach((section) => {
    const count = sectionMatchCounts.get(section.id) || 0;
    section.hidden = hasQuery && count === 0;
  });

  groupButtonsRef.forEach((button) => {
    const count = sectionMatchCounts.get(button.dataset.target) || 0;
    const wrap = button.closest('.nav-group');
    if (wrap) wrap.hidden = hasQuery && count === 0;
  });

  itemButtonsRef.forEach(({ button, item, categoryTitle }) => {
    const haystack = `${item.name} ${categoryTitle}`.toLowerCase();
    const matches = !hasQuery || haystack.includes(query);
    button.closest('li').hidden = !matches;
  });

  if (!hasQuery) {
    searchStatus.textContent = '';
  } else if (matchingTiles === 0) {
    searchStatus.textContent = `No signs match "${rawQuery}".`;
  } else {
    searchStatus.textContent = `${matchingTiles} sign${matchingTiles === 1 ? '' : 's'} match "${rawQuery}".`;
  }
};

/* ----------------------------- Dashboard render ----------------------------- */

const buildDashboard = (dataset) => {
  const groupButtons = [];
  const itemButtons = [];
  const tileNodes = [];

  // Clear prior state (in case of rebuild).
  toc.innerHTML = '';
  // Leave status node in place; we'll remove it after successful render.

  dataset.categories.forEach((category, categoryIndex) => {
    const sectionId = `section-${slugify(category.title)}-${categoryIndex}`;

    const groupWrap = document.createElement('div');
    groupWrap.className = 'nav-group';

    const groupButton = document.createElement('button');
    groupButton.type = 'button';
    groupButton.className = 'nav-group-title';
    groupButton.textContent = category.title;
    groupButton.dataset.target = sectionId;

    const list = document.createElement('ul');
    list.className = 'nav-item-list';

    category.items.forEach((item, itemIndex) => {
      const tileId = `${sectionId}-item-${itemIndex}`;

      const listItem = document.createElement('li');
      const itemButton = document.createElement('button');
      itemButton.type = 'button';
      itemButton.className = 'nav-item';
      itemButton.textContent = item.name;
      itemButton.dataset.target = tileId;
      listItem.appendChild(itemButton);
      list.appendChild(listItem);
      itemButtons.push({ button: itemButton, item, categoryTitle: category.title });
    });

    const derivedItemDownloads = category.items
      .map((item) => item.printReadyFile || item.downloadFile || item.image)
      .filter(Boolean);
    const downloadFiles = hasDownloadFiles(category.printReadyFiles)
      ? category.printReadyFiles
      : hasDownloadFiles(derivedItemDownloads)
        ? [...new Set(derivedItemDownloads)]
        : [];
    const singleDownloadHref =
      downloadFiles.length === 1 ? downloadFiles[0] : category.printReadyFile || category.downloadFile || '';

    let downloadControl;
    if (downloadFiles.length > 1) {
      downloadControl = document.createElement('button');
      downloadControl.type = 'button';
      downloadControl.className = 'nav-download';
      downloadControl.textContent = `Download all (${downloadFiles.length} files)`;
      downloadControl.addEventListener('click', async () => {
        const proceed = window.confirm(
          `This will download ${downloadFiles.length} files. Continue?`
        );
        if (!proceed) return;
        downloadControl.disabled = true;
        const originalLabel = downloadControl.textContent;
        downloadControl.textContent = 'Downloading…';
        const failures = await triggerFileBatchDownload(downloadFiles);
        downloadControl.disabled = false;
        if (failures.length) {
          downloadControl.textContent = `${failures.length} file${failures.length === 1 ? '' : 's'} failed — retry`;
        } else {
          downloadControl.textContent = 'Downloaded ✓';
          window.setTimeout(() => {
            downloadControl.textContent = originalLabel;
          }, 2400);
        }
      });
    } else if (singleDownloadHref) {
      downloadControl = document.createElement('a');
      downloadControl.className = 'nav-download';
      downloadControl.textContent = 'Download print-ready version';
      downloadControl.href = singleDownloadHref;
      downloadControl.setAttribute('download', '');
    } else {
      downloadControl = document.createElement('button');
      downloadControl.type = 'button';
      downloadControl.className = 'nav-download nav-download--disabled';
      downloadControl.textContent = 'Print-ready version unavailable';
      downloadControl.disabled = true;
    }

    groupWrap.append(groupButton, list, downloadControl);
    toc.appendChild(groupWrap);
    groupButtons.push(groupButton);

    const section = document.createElement('section');
    section.className = 'signage-section';
    section.id = sectionId;
    section.dataset.category = category.title;
    section.setAttribute('aria-labelledby', `${sectionId}-heading`);

    const heading = document.createElement('h2');
    heading.id = `${sectionId}-heading`;
    heading.textContent = category.title;

    const tiles = document.createElement('div');
    tiles.className = 'tiles';

    category.items.forEach((item, itemIndex) => {
      const figure = document.createElement('figure');
      figure.className = 'tile';
      figure.id = `${sectionId}-item-${itemIndex}`;
      figure.dataset.sectionId = sectionId;
      const showPowerPointPlaceholder = isPowerPointPlaceholder(category.title, item.name);

      const portraitMode =
        item.orientation === 'portrait' || item.details?.toLowerCase().includes('portrait');
      if (portraitMode) {
        figure.classList.add('tile--portrait');
      }
      const fallbackSrc = makeFallbackSrc(item.name, portraitMode ? 800 : 1200, portraitMode ? 1400 : 700);
      const isPdf = isPdfPath(item.image);
      const pdfSource = isPdf ? withPdfPage(item.image, item.page) : null;
      let preview;

      if (showPowerPointPlaceholder) {
        figure.classList.add('tile--placeholder');

        const placeholder = document.createElement('div');
        placeholder.className = 'tile-placeholder-message';
        placeholder.textContent = 'PowerPoint template ready';

        const divider = document.createElement('div');
        divider.className = 'tile-placeholder-divider';

        preview = document.createElement('div');
        preview.className = 'tile-placeholder-wrap';
        preview.append(placeholder, divider);
      } else if (isPdf) {
        const pdf = document.createElement('iframe');
        pdf.className = 'tile-pdf';
        pdf.src = pdfSource;
        pdf.title = `${item.name} PDF preview`;
        pdf.loading = 'lazy';
        preview = pdf;
      } else {
        const image = document.createElement('img');
        image.src = item.image;
        image.alt = item.name;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('error', () => {
          image.src = fallbackSrc;
        });
        preview = image;
      }

      const caption = document.createElement('figcaption');
      caption.textContent = item.name;
      figure.append(preview, caption);

      if (hasCustomDownload(item)) {
        const downloadButton = document.createElement('a');
        downloadButton.className = 'tile-download';
        downloadButton.href = item.downloadFile;
        downloadButton.textContent = item.downloadLabel || 'Download';
        downloadButton.setAttribute('download', '');
        // Prevent the tile-level click handler from opening the modal
        // whenever someone just wants to grab the file.
        downloadButton.addEventListener('click', (event) => event.stopPropagation());
        figure.appendChild(downloadButton);
      }

      tiles.appendChild(figure);

      tileNodes.push({
        figure,
        item,
        categoryTitle: category.title,
        sectionId,
        isPdf,
        pdfSource,
        isPlaceholder: showPowerPointPlaceholder
      });

      if (showPowerPointPlaceholder) {
        const divider = document.createElement('div');
        divider.className = 'tiles-divider';
        divider.setAttribute('aria-hidden', 'true');
        tiles.appendChild(divider);
        return;
      }

      // Make tile fully keyboard-activatable.
      figure.setAttribute('role', 'button');
      figure.setAttribute('tabindex', '0');
      figure.setAttribute('aria-label', `Open preview for ${item.name}`);

      const activate = () => {
        const previewEl = figure.querySelector('img, iframe');
        const source = isPdf
          ? pdfSource
          : (previewEl && (previewEl.currentSrc || previewEl.src)) || item.image;
        openModal(source, item.name, isPdf ? 'pdf' : 'image');
      };

      figure.addEventListener('click', (event) => {
        // Ignore clicks that originated on the tile-level download anchor.
        if (event.target.closest('.tile-download')) return;
        activate();
      });

      figure.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });

    section.append(heading, tiles);
    content.appendChild(section);
  });

  groupButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMobileNavIfNeeded();
    });
  });

  itemButtons.forEach(({ button }) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(() => {
        target?.classList.add('active-item');
        setTimeout(() => target?.classList.remove('active-item'), 900);
      });
      closeMobileNavIfNeeded();
    });
  });

  const sectionNodes = [...document.querySelectorAll('.signage-section')];

  // Expose for filter logic.
  groupButtonsRef = groupButtons;
  itemButtonsRef = itemButtons;
  tileNodesRef = tileNodes;
  sectionNodesRef = sectionNodes;

  // Scroll-spy: highlight the visible section's group and the *actually visible* tile.
  let lastActiveTileId = null;
  const tileObserver = new IntersectionObserver(
    (entries) => {
      const visibleTile = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visibleTile) return;

      const tileId = visibleTile.target.id;
      if (tileId === lastActiveTileId) return;
      lastActiveTileId = tileId;

      const sectionId = visibleTile.target.dataset.sectionId;
      let activeGroupButton = null;
      groupButtons.forEach((button) => {
        const isActive = button.dataset.target === sectionId;
        button.classList.toggle('active', isActive);
        if (isActive) activeGroupButton = button;
      });

      let activeItemButton = null;
      itemButtons.forEach(({ button }) => {
        const isActive = button.dataset.target === tileId;
        button.classList.toggle('active-item', isActive);
        if (isActive) activeItemButton = button;
      });

      // Only pull the sidebar along if the current active nav item is actually
      // off-screen — otherwise the sidebar scroll should remain user-controlled.
      const navTarget = activeItemButton || activeGroupButton;
      gentleScrollIntoView(navTarget, toc);
    },
    {
      root: null,
      threshold: [0.25, 0.5, 0.75],
      rootMargin: '-15% 0px -45% 0px'
    }
  );

  tileNodes.forEach(({ figure }) => tileObserver.observe(figure));

  // Remove the loading status once we have rendered content.
  if (contentStatus && contentStatus.parentNode) {
    contentStatus.parentNode.removeChild(contentStatus);
  }
};

/* ----------------------------- Mobile drawer ----------------------------- */

const isMobileViewport = () => window.matchMedia('(max-width: 760px)').matches;

const closeMobileNavIfNeeded = () => {
  if (!isMobileViewport()) return;
  sidebar.classList.remove('sidebar--open');
  navToggle.setAttribute('aria-expanded', 'false');
};

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('sidebar--open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ----------------------------- Wire-up ----------------------------- */

const renderError = (error) => {
  contentStatus.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'content-error';

  const headline = document.createElement('p');
  headline.className = 'content-error-headline';
  headline.textContent = 'Unable to load signage.';

  const detail = document.createElement('p');
  detail.className = 'content-error-detail';
  detail.textContent = error?.message || 'An unknown error occurred.';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'content-error-retry';
  retry.textContent = 'Try again';
  retry.addEventListener('click', loadData);

  wrap.append(headline, detail, retry);
  contentStatus.appendChild(wrap);
};

const loadData = () => {
  contentStatus.innerHTML = '<p>Loading signage&hellip;</p>';
  fetch('data/signage.json')
    .then((response) => {
      if (!response.ok) throw new Error('Unable to load signage dataset.');
      return response.json();
    })
    .then(buildDashboard)
    .catch(renderError);
};

loadData();

closeButton.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

// Search wiring
let searchDebounce;
if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    const value = event.target.value;
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => applyFilter(value), 90);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && searchInput.value) {
      event.preventDefault();
      searchInput.value = '';
      applyFilter('');
      searchInput.focus();
    }
  });
}

if (searchClear) {
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    applyFilter('');
    searchInput.focus();
  });
}

// Close drawer when tapping outside it on mobile.
document.addEventListener('click', (event) => {
  if (!isMobileViewport()) return;
  if (!sidebar.classList.contains('sidebar--open')) return;
  if (sidebar.contains(event.target) || navToggle.contains(event.target)) return;
  closeMobileNavIfNeeded();
});
