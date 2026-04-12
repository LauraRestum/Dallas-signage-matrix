const toc = document.getElementById('toc');
const content = document.getElementById('content');
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalPdf = document.getElementById('modal-pdf');
const closeButton = document.getElementById('modal-close');

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

const withPdfPage = (path, page) => {
  if (!isPdfPath(path)) return path;

  const [basePath] = String(path).split('#');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  params.set('view', 'FitH');
  params.set('toolbar', '0');
  params.set('navpanes', '0');

  return `${basePath}#${params.toString()}`;
};

const openModal = (src, altText, mediaType = 'image') => {
  const isPdf = mediaType === 'pdf';
  modalImage.style.display = isPdf ? 'none' : 'block';
  modalPdf.style.display = isPdf ? 'block' : 'none';

  if (isPdf) {
    modalPdf.src = src;
  } else {
    modalImage.src = src;
    modalImage.alt = altText;
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modalImage.src = '';
  modalPdf.src = '';
  document.body.style.overflow = '';
};

const buildDashboard = (dataset) => {
  const groupButtons = [];
  const itemButtons = [];

  dataset.categories.forEach((category, categoryIndex) => {
    const sectionId = `section-${slugify(category.title)}-${categoryIndex}`;

    const groupWrap = document.createElement('div');
    groupWrap.className = 'nav-group';

    const groupButton = document.createElement('button');
    groupButton.className = 'nav-group-title';
    groupButton.textContent = category.title;
    groupButton.dataset.target = sectionId;

    const list = document.createElement('ul');
    list.className = 'nav-item-list';

    category.items.forEach((item, itemIndex) => {
      const tileId = `${sectionId}-item-${itemIndex}`;

      const listItem = document.createElement('li');
      const itemButton = document.createElement('button');
      itemButton.className = 'nav-item';
      itemButton.textContent = item.name;
      itemButton.dataset.target = tileId;
      listItem.appendChild(itemButton);
      list.appendChild(listItem);
      itemButtons.push(itemButton);
    });

    groupWrap.append(groupButton, list);
    toc.appendChild(groupWrap);
    groupButtons.push(groupButton);

    const section = document.createElement('section');
    section.className = 'signage-section';
    section.id = sectionId;
    section.dataset.category = category.title;

    const heading = document.createElement('h2');
    heading.textContent = category.title;

    const tiles = document.createElement('div');
    tiles.className = 'tiles';

    category.items.forEach((item, itemIndex) => {
      const figure = document.createElement('figure');
      figure.className = 'tile';
      figure.id = `${sectionId}-item-${itemIndex}`;

      const portraitMode = item.details?.toLowerCase().includes('portrait');
      const fallbackSrc = makeFallbackSrc(item.name, portraitMode ? 800 : 1200, portraitMode ? 1400 : 700);
      const isPdf = isPdfPath(item.image);
      const pdfSource = isPdf ? withPdfPage(item.image, item.page) : null;
      let preview;

      if (isPdf) {
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
      tiles.appendChild(figure);

      figure.addEventListener('click', () => {
        const source = isPdf ? pdfSource : preview.currentSrc || preview.src || item.image;
        openModal(source, item.name, isPdf ? 'pdf' : 'image');
      });
    });

    section.append(heading, tiles);
    content.appendChild(section);
  });

  groupButtons.forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  itemButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(() => {
        target?.classList.add('active-item');
        setTimeout(() => target?.classList.remove('active-item'), 900);
      });
    });
  });

  const sectionNodes = [...document.querySelectorAll('.signage-section')];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visible.length) return;

      const activeSectionId = visible[0].target.id;

      groupButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.target === activeSectionId);
      });

      const activeSection = document.getElementById(activeSectionId);
      const activeTileId = activeSection?.querySelector('.tile')?.id;

      itemButtons.forEach((button) => {
        button.classList.toggle('active-item', button.dataset.target === activeTileId);
      });
    },
    {
      root: null,
      threshold: [0.2, 0.35, 0.5, 0.8],
      rootMargin: '-12% 0px -55% 0px'
    }
  );

  sectionNodes.forEach((section) => observer.observe(section));
};

fetch('data/signage.json')
  .then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load signage dataset.');
    }
    return response.json();
  })
  .then(buildDashboard)
  .catch((error) => {
    const message = document.createElement('p');
    message.textContent = error.message;
    message.style.color = '#b00020';
    content.appendChild(message);
  });

closeButton.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});
