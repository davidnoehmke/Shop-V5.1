<script setup lang="ts">
const { locale, de, embedded, homePath, shopLink, alternatePath } = useCalendar()
useHead(() => ({ htmlAttrs: { lang: locale.value } }))
useEmbedBridge()
</script>

<template>
  <div id="calendar-app" :class="{ embedded }">
    <a class="skip-link" href="#main-content">{{ de ? 'Zum Inhalt' : 'Skip to content' }}</a>
    <header v-if="!embedded" class="site-header rail">
      <NuxtLink class="brand" :to="homePath" :aria-label="de ? 'LEAFerservice Aussaatkalender' : 'LEAFerservice sowing calendar'">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25C4 12 12 5 27 5c0 15-8 22-21 20m0 0L22 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        <span>LEAF<span class="brand-light">erservice</span></span>
      </NuxtLink>
      <nav :aria-label="de ? 'Hauptnavigation' : 'Main navigation'">
        <NuxtLink :to="homePath" class="nav-active">{{ de ? 'Aussaatkalender' : 'Sowing calendar' }}</NuxtLink>
        <a :href="shopLink('/blogs/leafers-nice2know-blog/anzucht-leicht-gemacht')">{{ de ? 'Anzuchtwissen' : 'Growing guide' }}</a>
        <a :href="shopLink('/collections/anzucht-aussaat')" class="shop-nav">{{ de ? 'Zum Shop' : 'Shop' }} <span aria-hidden="true">↗</span></a>
      </nav>
      <NuxtLink class="language" :to="alternatePath" :aria-label="de ? 'Switch to English' : 'Auf Deutsch wechseln'">{{ de ? 'EN' : 'DE' }}</NuxtLink>
    </header>
    <main id="main-content" tabindex="-1"><NuxtPage /></main>
    <footer v-if="!embedded" class="site-footer rail">
      <div><strong>LEAFerservice</strong><p>{{ de ? 'Wissen, das mit dir wächst.' : 'Knowledge that grows with you.' }}</p></div>
      <nav :aria-label="de ? 'Rechtliche Informationen' : 'Legal information'">
        <a :href="shopLink('/policies/legal-notice')">{{ de ? 'Impressum' : 'Legal notice' }}</a>
        <a :href="shopLink('/policies/privacy-policy')">{{ de ? 'Datenschutz' : 'Privacy' }}</a>
        <NuxtLink :to="alternatePath">{{ de ? 'English' : 'Deutsch' }}</NuxtLink>
      </nav>
    </footer>
  </div>
</template>
