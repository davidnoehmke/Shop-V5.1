document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  let lastScroll = window.scrollY;
  let ticking = false;

  const updateHeaderState = () => {
    const currentScroll = window.scrollY;
    header.classList.toggle('is-scrolled', currentScroll > 12);
    header.classList.toggle('is-quiet', currentScroll > lastScroll && currentScroll > 180);
    lastScroll = currentScroll;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  }, { passive: true });
});

class InterieurSolutionsConfigurator extends HTMLElement {
      connectedCallback() {
        if (this.dataset.ready === 'true') return;
        this.dataset.ready = 'true';

        this.form = this.querySelector('[data-config-form]');
        this.cards = [...this.querySelectorAll('[data-solution-card]')];
        this.profileTitle = this.querySelector('[data-profile-title]');
        this.profileCopy = this.querySelector('[data-profile-copy]');
        this.profileChips = this.querySelector('[data-profile-chips]');
        this.resultCount = this.querySelector('[data-result-count]');
        this.budgetNote = this.querySelector('[data-budget-note]');
        this.results = this.querySelector('[data-recommendations]');

        this.form?.addEventListener('input', () => this.update());
        this.querySelector('[data-reset]')?.addEventListener('click', () => this.reset());

        this.update();
      }

      value(name) {
        return this.form?.querySelector(`input[name="${name}"]:checked`)?.value || '';
      }

      label(name) {
        return this.form?.querySelector(`input[name="${name}"]:checked`)?.closest('label')?.querySelector('[data-option-label]')?.textContent?.trim() || '';
      }

      includes(text, terms) {
        return terms.some((term) => text.includes(term));
      }

      score(card, state) {
        const text = (card.dataset.search || '').toLocaleLowerCase('de-DE');
        const watts = Number(card.dataset.watts || 0);
        let score = 0;

        const projectTerms = {
          single: ['e27', 'par30', 'par38', 'teleskop', 'willow', 'vita', 'pflanzenlampe', 'pflanzenleuchte'],
          shelf: ['regal', 'grove', 'aurora', 'bar', 'tube', 'cx91', 'cx83'],
          pendant: ['pendel', 'pendant', 'wand', 'luna', 'aspect', 'stello'],
          station: ['pflanzenregal', 'gewächshaus', 'station', 'growzelt', 'vivosun', 'barrina', 'cx91', 'cx83'],
          habitat: ['terrarium', 'aquascap', 'wasserpflanz', 'daytime', 'sera', 'repmac']
        };
        if (this.includes(text, projectTerms[state.project] || [])) score += state.project === 'habitat' ? 8 : 6;

        const roomTerms = {
          living: ['soltech', 'mother', 'premium', 'wohn', 'willow', 'aspect', 'vita', 'grove'],
          office: ['mother', 'soltech', 'regal', 'stand', 'plantspectrum', 'grove'],
          kitchen: ['e27', 'bloom', '7w', '10w', '15w', 'kräuter', 'teleskop'],
          plantroom: ['sansi', 'barrina', 'vivosun', '60w', 'grow', 'station', 'gewächshaus']
        };
        if (this.includes(text, roomTerms[state.room] || [])) score += 4;

        const mountTerms = {
          e27: ['e27', 'par30', 'par38', 'bulb', 'leuchtmittel'],
          shelf: ['regal', 'grove', 'aurora', 'bar', 'tube'],
          pendant: ['pendel', 'pendant', 'wand', 'luna', 'aspect'],
          floor: ['stand', 'standfuß', 'floor', 'willow', 'stello', 'alta', 'teleskop'],
          system: ['station', 'gewächshaus', 'terrarium', 'zelt', 'regal']
        };
        if (state.mount !== 'open' && this.includes(text, mountTerms[state.mount] || [])) score += 5;

        if (state.light === 'supplement') {
          if (watts > 0 && watts <= 15) score += 4;
          if (this.includes(text, ['7w', '10w', '15w', 'e27', 'teleskop'])) score += 2;
        }
        if (state.light === 'balanced') {
          if (watts >= 10 && watts <= 35) score += 4;
          if (this.includes(text, ['20w', '24w', '25w', '32'])) score += 2;
        }
        if (state.light === 'intensive') {
          if (watts >= 25) score += 5;
          if (this.includes(text, ['36w', '60w', 'station', 'gewächshaus', 'plantspectrum32'])) score += 3;
        }

        if (state.project === 'habitat' && this.includes(text, ['terrarium', 'aquascap', 'wasserpflanz'])) score += 4;
        if (state.project === 'station' && this.includes(text, ['regal', 'station', 'gewächshaus'])) score += 4;
        if (state.room === 'living' && this.includes(text, ['growzelt', 'vivosun'])) score -= 4;

        return score;
      }

      update() {
        if (!this.form || !this.cards.length) return;

        const state = {
          room: this.value('room'),
          project: this.value('project'),
          mount: this.value('mount'),
          light: this.value('light'),
          budget: this.value('budget')
        };
        const budget = state.budget === 'open' ? Infinity : Number(state.budget || 150);

        const ranked = this.cards
          .map((card) => ({
            card,
            score: this.score(card, state),
            price: Number(card.dataset.price || 0)
          }))
          .sort((a, b) => b.score - a.score || a.price - b.price);

        let eligible = ranked.filter((item) => item.price <= budget && item.score > 0);
        let relaxed = false;

        if (eligible.length === 0) {
          eligible = ranked.filter((item) => item.score > 0);
          relaxed = true;
        }
        if (eligible.length === 0) eligible = ranked;

        const top = eligible.slice(0, 4);
        const selected = new Set(top.map((item) => item.card));

        this.cards.forEach((card) => {
          card.hidden = !selected.has(card);
        });
        top.forEach((item) => this.results?.append(item.card));

        const projectLabel = this.label('project');
        const roomLabel = this.label('room');
        if (this.profileTitle) this.profileTitle.textContent = [projectLabel, roomLabel].filter(Boolean).join(' · ');
        if (this.profileCopy) this.profileCopy.textContent = this.dataset.profileCopy || '';

        if (this.profileChips) {
          this.profileChips.replaceChildren();
          ['mount', 'light', 'budget'].forEach((name) => {
            const text = this.label(name);
            if (!text) return;
            const chip = document.createElement('span');
            chip.textContent = text;
            this.profileChips.append(chip);
          });
        }

        if (this.resultCount) {
          this.resultCount.textContent = top.length === 1
            ? (this.dataset.resultOne || '1')
            : `${top.length} ${this.dataset.resultMany || ''}`.trim();
        }

        if (this.budgetNote) {
          this.budgetNote.hidden = !relaxed;
          this.budgetNote.textContent = relaxed ? (this.dataset.budgetRelaxed || '') : '';
        }
      }

      reset() {
        if (!this.form) return;
        this.form.reset();
        this.update();
      }
    }

    if (!customElements.get('interieur-solutions-configurator')) {
      customElements.define('interieur-solutions-configurator', InterieurSolutionsConfigurator);
    }
