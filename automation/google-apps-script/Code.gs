/**
 * LEAFerservice content_db -> Shopify
 *
 * Sicherheitsmodell:
 * - Update-only: Es gibt absichtlich keine Produkt-Anlage.
 * - Standardmodus DRY_RUN.
 * - Keine Status-/Publish-Mutation.
 * - Live-Lauf nur mit MODE=LIVE, Zeilenfreigabe und Texteingabe LIVE.
 * - Bestand bleibt gesperrt; der Wert 50 im Sheet ist nur ein Vorschlag.
 *
 * Ziel-Sheet: in der privaten Installation konfigurieren.
 */

var LS = {
  API_VERSION: '2026-07',
  SHEET_SYNC: 'Shopify_Sync',
  SHEET_CONFIG: 'Shopify_Config',
  SHEET_LOG: 'Shopify_Log',
  SHEET_PRODUCTS: 'Produkte',
  SHEET_VARIANTS: 'Varianten',
  SHEET_FAQ: 'FAQ',
  SHEET_CROSS: 'Cross Selling',
  SHEET_SEO: 'SEO',
  MAX_ROWS_HARD: 100,
  COL: {
    APPROVE_CONTENT: 0,
    APPROVE_INVENTORY: 1,
    PRODUCT_KEY: 2,
    HANDLE: 3,
    PRODUCT_TITLE: 4,
    SHEET_STATUS: 5,
    PRODUCT_GID: 6,
    SKU: 7,
    VARIANT_VALUE: 8,
    VARIANT_UNIT: 9,
    VARIANT_GID: 10,
    PRICE: 11,
    PRICE_SOURCE: 12,
    PRICE_CONFIDENCE: 13,
    INVENTORY_SUGGESTION: 14,
    INVENTORY_SOURCE: 15,
    INVENTORY_CONFIDENCE: 16,
    CONTENT_READY: 17,
    ACTION: 18,
    LAST_RESULT: 19,
    LAST_SYNC: 20,
    UNCERTAINTY: 21,
    SHOPIFY_MATCH: 22,
    DUPLICATE_CHECK: 23
  }
};

var LS_CONFIG_CACHE = null;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Shopify Sync')
    .addItem('1 · Verbindung einrichten', 'setupShopifyConnection')
    .addItem('2 · Verbindung testen', 'testShopifyConnection')
    .addItem('3 · Shopify-IDs abgleichen (nur lesen)', 'scanShopifyIds')
    .addSeparator()
    .addItem('4 · Dry-Run erstellen', 'runDryRun')
    .addItem('5 · Freigegebene Inhalte/Preise LIVE synchronisieren', 'syncApprovedRows')
    .addItem('6 · Globale Wissensinhalte LIVE synchronisieren', 'syncGlobalContent')
    .addItem('7 · Shopify → Notion Rücksync (Dry-Run)', 'syncShopifyToNotionDryRun')
    .addItem('8 · Shopify → Notion Rücksync LIVE', 'syncShopifyToNotion')
    .addItem('9 · Shopify → Notion Automatik einrichten', 'setupShopifyToNotionTrigger')
    .addSeparator()
    .addItem('Verbindung löschen', 'clearShopifyConnection')
    .addToUi();
}

/**
 * Shopify → Notion Rückkanal.
 *
 * Shopify bleibt für Live-Commerce-Felder führend. Redaktionelle Notion-Felder
 * wie HTML, FAQ, Rezeptur und SEO werden bewusst nicht überschrieben.
 * Der Rücksync verwendet die Shopify-GID als stabilen Schlüssel und legt für
 * noch nicht vorhandene Shopify-Produkte einen neuen Notion-Datensatz an.
 */
function syncShopifyToNotionDryRun() {
  syncShopifyToNotion_(true);
}

function syncShopifyToNotion() {
  syncShopifyToNotion_(false);
}

function setupShopifyToNotionTrigger() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Shopify → Notion Automatik',
    'Die Automatik prüft Shopify regelmäßig und schreibt Commerce-Daten nach Notion. ' +
      'Vorhandene redaktionelle Notion-Felder werden nicht überschrieben. Fortfahren?',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) return;

  var tokenPrompt = ui.prompt(
    'Notion Integration Token',
    'Token eingeben. Er wird ausschließlich in den Script Properties gespeichert.',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenPrompt.getSelectedButton() !== ui.Button.OK) return;
  var token = String(tokenPrompt.getResponseText() || '').trim();
  if (!token) throw new Error('Notion Integration Token fehlt.');

  var databasePrompt = ui.prompt(
    'Notion-Datenbank-ID',
    'Private Notion-Datenbank-ID eingeben',
    ui.ButtonSet.OK_CANCEL
  );
  if (databasePrompt.getSelectedButton() !== ui.Button.OK) return;
  var databaseId = normalizeNotionId_(databasePrompt.getResponseText());
  if (!databaseId) throw new Error('Ungültige Notion-Datenbank-ID.');

  PropertiesService.getScriptProperties().setProperties({
    NOTION_API_TOKEN: token,
    NOTION_DATABASE_ID: databaseId,
    NOTION_API_VERSION: '2022-06-28',
    SHOPIFY_TO_NOTION_ENABLED: 'TRUE'
  }, false);

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncShopifyToNotion') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('syncShopifyToNotion')
    .timeBased()
    .everyHours(1)
    .create();

  ui.alert('Automatik eingerichtet', 'Shopify → Notion wird ab jetzt stündlich geprüft. ' +
    'Einmalig zuerst den Dry-Run ausführen.', ui.ButtonSet.OK);
}

function syncShopifyToNotion_(dryRun) {
  var props = PropertiesService.getScriptProperties();
  var token = String(props.getProperty('NOTION_API_TOKEN') || '').trim();
  var databaseId = normalizeNotionId_(props.getProperty('NOTION_DATABASE_ID'));
  if (!token || !databaseId) {
    throw new Error('Notion-Verbindung fehlt. Menü "9 · Shopify → Notion Automatik einrichten" verwenden.');
  }
  if (!dryRun && String(props.getProperty('SHOPIFY_TO_NOTION_ENABLED') || '').toUpperCase() !== 'TRUE') {
    throw new Error('SHOPIFY_TO_NOTION_ENABLED ist nicht TRUE. Zuerst die Automatik einrichten.');
  }

  var pages = notionListDatabasePages_(databaseId);
  var pagesByGid = {};
  pages.forEach(function(page) {
    var gid = notionPropertyText_(page.properties['Shopify-GID']);
    if (gid) pagesByGid[gid] = page;
  });

  var products = shopifyListProducts_();
  var changed = 0;
  var created = 0;
  var skipped = 0;
  var errors = [];

  products.forEach(function(product) {
    try {
      var page = pagesByGid[product.id];
      var properties = buildNotionShopifyProperties_(product, databaseId);
      if (page) {
        if (!dryRun) notionUpdatePageProperties_(page.id, properties);
        changed++;
      } else {
        if (!dryRun) {
          var createdPage = notionCreateProductPage_(databaseId, properties);
          pagesByGid[product.id] = createdPage;
        }
        created++;
      }
    } catch (error) {
      errors.push(product.id + ': ' + error.message);
    }
  });

  var timestamp = new Date();
  props.setProperty('NOTION_LAST_REVERSE_SYNC', timestamp.toISOString());
  appendLog_(dryRun ? 'NOTION_DRY_RUN' : 'NOTION_REVERSE', 'SHOPIFY_TO_NOTION',
    '', '', '', '', errors.length ? 'FEHLER' : 'OK',
    'Produkte geprüft: ' + products.length + '; aktualisiert: ' + changed +
      '; neu: ' + created + '; Fehler: ' + errors.length +
      (errors.length ? ' | ' + errors.join(' || ') : ''),
    hashObject_({timestamp: timestamp.toISOString(), products: products.map(function(p) { return p.id + ':' + p.updatedAt; })}));

  var summary = 'Produkte geprüft: ' + products.length +
    '\nVorhandene Datensätze: ' + changed +
    '\nNeue Datensätze: ' + created +
    '\nFehler: ' + errors.length +
    (dryRun ? '\n\nEs wurden keine Notion-Daten verändert.' : '');
  if (dryRun) {
    SpreadsheetApp.getUi().alert('Shopify → Notion Dry-Run', summary,
      SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getActive().toast(summary.replace(/\\n/g, ' · '),
      'Shopify → Notion Rücksync', 10);
  }
}

function shopifyListProducts_() {
  var all = [];
  var cursor = null;
  do {
    var query =
      'query Products($cursor: String) {' +
      ' products(first: 100, after: $cursor, sortKey: UPDATED_AT) {' +
      '  pageInfo { hasNextPage endCursor }' +
      '  nodes { id title handle vendor status updatedAt onlineStoreUrl featuredImage { url altText }' +
      '   variants(first: 100) { nodes { id title sku price } }' +
      '  }' +
      ' }' +
      '}';
    var data = shopifyGraphql_(query, {cursor: cursor});
    all = all.concat(data.products.nodes || []);
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
  return all;
}

function buildNotionShopifyProperties_(product, databaseId) {
  var variants = (product.variants && product.variants.nodes) || [];
  var skus = variants.map(function(v) { return String(v.sku || '').trim(); }).filter(Boolean);
  var sizes = variants.map(function(v) { return String(v.title || '').trim(); }).filter(function(v) {
    return v && v !== 'Default Title';
  });
  var firstPrice = variants.length ? Number(variants[0].price) : null;
  var properties = {};
  properties['Produkt / Suchbegriff'] = {
    title: [{type: 'text', text: {content: String(product.title || 'Shopify-Produkt').slice(0, 2000)}}]
  };
  properties['Shopify-GID'] = notionRichText_(product.id);
  properties['Shopify-Handle'] = notionRichText_(product.handle);
  properties['Shopify-Status'] = notionRichText_(product.status);
  properties['Shopify-Vendor'] = notionRichText_(product.vendor);
  properties['Produktlink'] = product.onlineStoreUrl ? {url: product.onlineStoreUrl} : {url: null};
  properties['SKU / Artikel-Nr.'] = notionRichText_(skus.join(', '));
  properties['Varianten / Größen'] = notionRichText_(sizes.join(', '));
  if (firstPrice !== null && !isNaN(firstPrice)) properties['Ziel-VK brutto €'] = {number: firstPrice};
  properties['Status'] = notionRichText_('Shopify zuletzt geändert: ' + product.updatedAt);
  properties['Zuletzt synchronisiert'] = {date: {start: new Date().toISOString()}};
  return properties;
}

function notionListDatabasePages_(databaseId) {
  var pages = [];
  var cursor = null;
  do {
    var body = {page_size: 100};
    if (cursor) body.start_cursor = cursor;
    var response = notionRequest_('/databases/' + databaseId + '/query', 'post', body);
    pages = pages.concat(response.results || []);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);
  return pages;
}

function notionUpdatePageProperties_(pageId, properties) {
  return notionRequest_('/pages/' + pageId, 'patch', {properties: properties});
}

function notionCreateProductPage_(databaseId, properties) {
  var titleProperty = properties['Produkt / Suchbegriff'];
  var title = titleProperty && titleProperty.title && titleProperty.title[0] &&
    titleProperty.title[0].text && titleProperty.title[0].text.content;
  return notionRequest_('/pages', 'post', {
    parent: {database_id: databaseId},
    properties: Object.assign({
      'Produkt / Suchbegriff': {title: [{type: 'text', text: {content: title || 'Shopify-Produkt'}}]}
    }, properties)
  });
}

function notionRequest_(path, method, body) {
  var props = PropertiesService.getScriptProperties();
  var token = String(props.getProperty('NOTION_API_TOKEN') || '').trim();
  var version = String(props.getProperty('NOTION_API_VERSION') || '2022-06-28');
  var response = UrlFetchApp.fetch('https://api.notion.com/v1' + path, {
    method: method,
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': version
    },
    payload: JSON.stringify(body || {}),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  var data;
  try { data = JSON.parse(text); } catch (error) {
    throw new Error('Notion-Antwort ist kein JSON (HTTP ' + code + ').');
  }
  if (code < 200 || code >= 300) {
    throw new Error('Notion HTTP ' + code + ': ' + truncate_(data.message || text, 500));
  }
  return data;
}

function notionRichText_(value) {
  var text = String(value || '').trim();
  return {rich_text: text ? [{type: 'text', text: {content: text.slice(0, 2000)}}] : []};
}

function notionPropertyText_(property) {
  if (!property) return '';
  var type = property.type;
  if (type === 'title' || type === 'rich_text') {
    return (property[type] || []).map(function(item) {
      return item.plain_text || (item.text && item.text.content) || '';
    }).join('').trim();
  }
  if (type === 'url') return String(property.url || '').trim();
  return '';
}

function normalizeNotionId_(value) {
  var id = String(value || '').trim().replace(/-/g, '');
  return /^[a-f0-9]{32}$/i.test(id) ? id : '';
}

function setupShopifyConnection() {
  var ui = SpreadsheetApp.getUi();
  var domainPrompt = ui.prompt(
    'Shopify-Verbindung',
    'Shop-Domain eingeben, z. B. dein-shop.myshopify.com',
    ui.ButtonSet.OK_CANCEL
  );
  if (domainPrompt.getSelectedButton() !== ui.Button.OK) return;

  var domain = normalizeDomain_(domainPrompt.getResponseText());
  if (!domain) throw new Error('Ungültige Shop-Domain.');

  var tokenPrompt = ui.prompt(
    'Shopify Admin API Token',
    'Access Token eingeben. Er wird ausschließlich in den Script Properties gespeichert, niemals im Sheet.',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenPrompt.getSelectedButton() !== ui.Button.OK) return;

  var token = String(tokenPrompt.getResponseText() || '').trim();
  if (!token) throw new Error('Access Token fehlt.');

  PropertiesService.getScriptProperties().setProperties({
    SHOPIFY_SHOP_DOMAIN: domain,
    SHOPIFY_ACCESS_TOKEN: token
  }, false);

  ui.alert('Verbindung gespeichert. Als Nächstes bitte "Verbindung testen" ausführen.');
}

function clearShopifyConnection() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Verbindung löschen?',
    'Shop-Domain und Access Token werden aus den Script Properties entfernt.',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().deleteProperty('SHOPIFY_SHOP_DOMAIN');
  PropertiesService.getScriptProperties().deleteProperty('SHOPIFY_ACCESS_TOKEN');
  ui.alert('Shopify-Verbindung gelöscht.');
}

function testShopifyConnection() {
  var data = shopifyGraphql_(
    'query ConnectionTest { shop { id name myshopifyDomain } }',
    {}
  );
  SpreadsheetApp.getUi().alert(
    'Verbindung erfolgreich',
    data.shop.name + '\n' + data.shop.myshopifyDomain + '\n' + data.shop.id,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Read-only gegen Shopify. Schreibt ausschließlich gefundene IDs und Prüfstatus
 * zurück in Shopify_Sync.
 */
function scanShopifyIds() {
  var sheet = requiredSheet_(LS.SHEET_SYNC);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Shopify_Sync enthält keine Datenzeilen.');

  var cfg = readConfig_();
  var rowLimit = Math.min(
    Number(cfg.MAX_ROWS_PER_RUN || LS.MAX_ROWS_HARD),
    LS.MAX_ROWS_HARD,
    values.length - 1
  );

  var productGids = [];
  var variantGids = [];
  var statusBlock = [];
  var now = new Date();

  for (var i = 1; i <= rowLimit; i++) {
    var row = values[i];
    var handle = String(row[LS.COL.HANDLE] || '').trim();
    var sku = String(row[LS.COL.SKU] || '').trim();
    var existingUncertainty = String(row[LS.COL.UNCERTAINTY] || '')
      .replace('Shopify Product-/Variant-GID fehlt; ', '');

    var productGid = '';
    var variantGid = '';
    var action = 'BLOCKIERT';
    var result = '';
    var match = 'nicht gefunden';
    var duplicate = 'offen';

    try {
      if (!handle || !sku) {
        result = 'Handle oder SKU fehlt.';
        duplicate = 'Schlüssel fehlt';
      } else {
        var variants = findVariantsBySku_(sku);
        var exact = variants.filter(function(node) {
          return String(node.sku || '').trim() === sku;
        });

        if (exact.length === 1) {
          var found = exact[0];
          productGid = found.product.id;
          variantGid = found.id;

          if (String(found.product.handle || '') !== handle) {
            result = 'SKU gefunden, aber Handle weicht ab: ' + found.product.handle;
            match = 'Konflikt';
            duplicate = 'Handle-Abweichung';
          } else {
            action = 'UPDATE';
            result = 'Product- und Variant-ID eindeutig gefunden.';
            match = 'gefunden';
            duplicate = 'eindeutig';
          }
        } else if (exact.length > 1) {
          result = 'SKU ist in Shopify mehrfach vorhanden.';
          match = 'mehrdeutig';
          duplicate = 'mehrere SKU-Treffer';
        } else {
          var products = findProductsByHandle_(handle);
          var exactProducts = products.filter(function(node) {
            return String(node.handle || '') === handle;
          });

          if (exactProducts.length === 1) {
            productGid = exactProducts[0].id;
            result = 'Produkt gefunden, Variante/SKU fehlt.';
            match = 'Teiltreffer';
            duplicate = 'kein SKU-Treffer';
          } else if (exactProducts.length > 1) {
            result = 'Handle ist in Shopify mehrfach vorhanden.';
            match = 'mehrdeutig';
            duplicate = 'mehrere Handle-Treffer';
          } else {
            result = 'Kein bestehendes Shopify-Produkt gefunden. Update-only blockiert.';
            duplicate = 'kein Treffer';
          }
        }
      }
    } catch (error) {
      result = 'ID-Abgleich fehlgeschlagen: ' + error.message;
      match = 'Fehler';
      duplicate = 'Prüffehler';
    }

    productGids.push([productGid]);
    variantGids.push([variantGid]);
    statusBlock.push([
      action,
      result,
      now,
      existingUncertainty,
      match,
      duplicate
    ]);

    Utilities.sleep(80);
  }

  sheet.getRange(2, LS.COL.PRODUCT_GID + 1, rowLimit, 1).setValues(productGids);
  sheet.getRange(2, LS.COL.VARIANT_GID + 1, rowLimit, 1).setValues(variantGids);
  sheet.getRange(2, LS.COL.ACTION + 1, rowLimit, 6).setValues(statusBlock);
  sheet.getRange(2, LS.COL.LAST_SYNC + 1, rowLimit, 1)
    .setNumberFormat('yyyy-mm-dd hh:mm:ss');

  writeConfigValue_('LAST_ID_SCAN', now);
  appendLog_('READ_ONLY', 'ID_SCAN', '', '', '', '', 'OK',
    rowLimit + ' Zeilen geprüft.', '');
  SpreadsheetApp.getActive().toast(
    rowLimit + ' Zeilen wurden gegen Shopify geprüft.',
    'Shopify ID-Abgleich',
    8
  );
}

function runDryRun() {
  var plan = buildPlan_();
  var now = new Date();

  if (!plan.selected.length) {
    SpreadsheetApp.getUi().alert(
      'Keine Freigaben',
      'In Shopify_Sync ist keine Zeile in Spalte A oder B freigegeben.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  plan.selected.forEach(function(item) {
    var status = item.blockers.length
      ? 'DRY_RUN BLOCKIERT: ' + item.blockers.join(' | ')
      : 'DRY_RUN BEREIT: Inhalt/Preis kann update-only synchronisiert werden.';
    updateRowResult_(item.sheetRow, status, now);
    appendLog_(
      'DRY_RUN',
      item.blockers.length ? 'BLOCKED' : 'READY',
      item.productKey,
      item.handle,
      item.sku,
      item.variantGid || item.productGid,
      item.blockers.length ? 'BLOCKIERT' : 'BEREIT',
      status,
      hashObject_(item)
    );
  });

  writeConfigValue_('LAST_DRY_RUN', now);
  SpreadsheetApp.getUi().alert(
    'Dry-Run abgeschlossen',
    'Freigegebene Zeilen: ' + plan.selected.length +
      '\nBereit: ' + plan.ready.length +
      '\nBlockiert: ' + plan.blocked.length +
      '\nShopify wurde nicht verändert.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function syncApprovedRows() {
  var cfg = readConfig_();
  enforceLiveSafety_(cfg);

  var plan = buildPlan_();
  if (!plan.selected.length) {
    SpreadsheetApp.getUi().alert('Keine Zeilen freigegeben.');
    return;
  }
  if (!plan.ready.length) {
    SpreadsheetApp.getUi().alert('Alle freigegebenen Zeilen sind blockiert. Zuerst Dry-Run und ID-Abgleich prüfen.');
    return;
  }

  confirmLive_(
    'Es werden ausschließlich vorhandene Produkt-/Varianten-IDs aktualisiert. ' +
    'Es wird nichts veröffentlicht und kein Produkt neu angelegt.'
  );

  var byProduct = {};
  plan.ready.forEach(function(item) {
    if (!byProduct[item.productGid]) {
      byProduct[item.productGid] = {
        productGid: item.productGid,
        productKey: item.productKey,
        handle: item.handle,
        contentApproved: false,
        items: []
      };
    }
    byProduct[item.productGid].items.push(item);
    byProduct[item.productGid].contentApproved =
      byProduct[item.productGid].contentApproved || item.approveContent;
  });

  var now = new Date();
  var successCount = 0;
  var errorCount = 0;

  Object.keys(byProduct).forEach(function(productGid) {
    var group = byProduct[productGid];
    try {
      if (group.contentApproved) {
        syncProductContent_(group);
      }
      syncVariantPrices_(group);

      group.items.forEach(function(item) {
        var message = item.approveInventory
          ? 'Inhalt/Preis synchronisiert; Bestand bewusst NICHT synchronisiert.'
          : 'Inhalt/Preis update-only synchronisiert.';
        updateRowResult_(item.sheetRow, message, now);
        appendLog_(
          'LIVE',
          'UPDATE',
          item.productKey,
          item.handle,
          item.sku,
          item.variantGid || item.productGid,
          'OK',
          message,
          hashObject_(item)
        );
        successCount++;
      });
    } catch (error) {
      group.items.forEach(function(item) {
        var message = 'LIVE FEHLER: ' + error.message;
        updateRowResult_(item.sheetRow, message, now);
        appendLog_(
          'LIVE',
          'UPDATE',
          item.productKey,
          item.handle,
          item.sku,
          item.variantGid || item.productGid,
          'FEHLER',
          message,
          hashObject_(item)
        );
        errorCount++;
      });
    }
  });

  writeConfigValue_('LAST_LIVE_SYNC', now);
  SpreadsheetApp.getUi().alert(
    'Live-Sync abgeschlossen',
    'Erfolgreiche Zeilen: ' + successCount +
      '\nFehler: ' + errorCount +
      '\nProduktstatus/Veröffentlichung wurden nicht geändert.' +
      '\nBestände wurden nicht geändert.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function syncGlobalContent() {
  var cfg = readConfig_();
  enforceLiveSafety_(cfg);
  if (!truthy_(cfg.SYNC_GLOBAL_CONTENT)) {
    throw new Error('SYNC_GLOBAL_CONTENT ist in Shopify_Config deaktiviert.');
  }

  confirmLive_(
    'Globale Wissensdaten werden als Shop-Metafelder gespeichert. ' +
    'Es werden keine Blogartikel, Seiten oder Theme-Inhalte veröffentlicht.'
  );

  var shop = shopifyGraphql_(
    'query ShopOwner { shop { id name } }',
    {}
  ).shop;

  var sources = [
    { sheet: 'Probleme', key: 'problems' },
    { sheet: 'Lösungen ', key: 'solutions' },
    { sheet: 'Bilder', key: 'images' },
    { sheet: 'Blogs', key: 'blogs' },
    { sheet: 'Pflanzen', key: 'plants' }
  ];

  var metafields = [];
  sources.forEach(function(source) {
    var rows = readSheetObjects_(source.sheet);
    if (!rows.length) return;
    metafields.push({
      ownerId: shop.id,
      namespace: 'leafer',
      key: source.key,
      type: 'json',
      value: JSON.stringify(rows)
    });
  });

  if (!metafields.length) {
    SpreadsheetApp.getUi().alert('Keine befüllten globalen Quellblätter gefunden.');
    return;
  }

  setMetafields_(metafields);
  appendLog_(
    'LIVE',
    'GLOBAL_CONTENT',
    '',
    '',
    '',
    shop.id,
    'OK',
    metafields.length + ' globale JSON-Metafelder gesetzt.',
    hashObject_(metafields)
  );
  SpreadsheetApp.getUi().alert(
    metafields.length + ' globale Wissensbereiche wurden als Shop-Metafelder gespeichert.'
  );
}

function buildPlan_() {
  var sheet = requiredSheet_(LS.SHEET_SYNC);
  var values = sheet.getDataRange().getValues();
  var cfg = readConfig_();
  var maxRows = Math.min(
    Number(cfg.MAX_ROWS_PER_RUN || LS.MAX_ROWS_HARD),
    LS.MAX_ROWS_HARD
  );

  var approvalCount = values.slice(1).filter(function(row) {
    return row[LS.COL.APPROVE_CONTENT] === true ||
      row[LS.COL.APPROVE_INVENTORY] === true;
  }).length;
  if (approvalCount > maxRows) {
    throw new Error(
      approvalCount + ' Zeilen sind freigegeben; erlaubt sind maximal ' + maxRows + ' pro Lauf.'
    );
  }

  var selected = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var approveContent = row[LS.COL.APPROVE_CONTENT] === true;
    var approveInventory = row[LS.COL.APPROVE_INVENTORY] === true;
    if (!approveContent && !approveInventory) continue;

    var item = {
      sheetRow: i + 1,
      approveContent: approveContent,
      approveInventory: approveInventory,
      productKey: String(row[LS.COL.PRODUCT_KEY] || '').trim(),
      handle: String(row[LS.COL.HANDLE] || '').trim(),
      productGid: String(row[LS.COL.PRODUCT_GID] || '').trim(),
      sku: String(row[LS.COL.SKU] || '').trim(),
      variantGid: String(row[LS.COL.VARIANT_GID] || '').trim(),
      price: row[LS.COL.PRICE],
      priceSource: String(row[LS.COL.PRICE_SOURCE] || ''),
      priceConfidence: String(row[LS.COL.PRICE_CONFIDENCE] || ''),
      inventorySuggestion: row[LS.COL.INVENTORY_SUGGESTION],
      action: String(row[LS.COL.ACTION] || ''),
      contentReady: String(row[LS.COL.CONTENT_READY] || ''),
      blockers: []
    };

    if (item.action !== 'UPDATE') item.blockers.push('Sync-Aktion ist nicht UPDATE');
    if (!isGid_(item.productGid, 'Product')) item.blockers.push('Product-GID fehlt/ist ungültig');

    if (approveContent) {
      if (!isGid_(item.variantGid, 'ProductVariant')) item.blockers.push('Variant-GID fehlt/ist ungültig');
      if (item.contentReady !== 'Ja') item.blockers.push('Inhalt ist nicht als vollständig markiert');
      if (item.price !== '' && item.price !== null) {
        if (!(Number(item.price) > 0)) item.blockers.push('Preis ist nicht positiv');
        if (item.priceConfidence !== 'hoch') item.blockers.push('Preis-Sicherheit ist nicht hoch');
      }
    }

    if (approveInventory) {
      item.blockers.push('Bestands-Sync ist bewusst gesperrt; 50 ist nur eine Annahme');
    }

    selected.push(item);
  }

  return {
    selected: selected,
    ready: selected.filter(function(item) { return !item.blockers.length; }),
    blocked: selected.filter(function(item) { return item.blockers.length; })
  };
}

function syncProductContent_(group) {
  var product = findSourceProduct_(group.productKey);
  if (!product) throw new Error('Produkt-ID fehlt im Blatt Produkte: ' + group.productKey);

  var productInput = {
    id: group.productGid
  };
  putNonBlank_(productInput, 'title', product.row[1]);
  putNonBlank_(productInput, 'handle', product.row[3]);
  putNonBlank_(productInput, 'vendor', product.row[4]);
  putNonBlank_(productInput, 'productType', product.row[6]);
  putNonBlank_(productInput, 'descriptionHtml', buildProductDescriptionHtml_(product.row));

  var seo = {};
  putNonBlank_(seo, 'title', product.row[45]);
  putNonBlank_(seo, 'description', product.row[46]);
  if (Object.keys(seo).length) productInput.seo = seo;

  var mutation =
    'mutation UpdateProduct($product: ProductUpdateInput!) {' +
    ' productUpdate(product: $product) {' +
    '  product { id handle title status }' +
    '  userErrors { field message }' +
    ' }' +
    '}';
  var data = shopifyGraphql_(mutation, { product: productInput });
  assertUserErrors_(data.productUpdate.userErrors, 'productUpdate');

  var metafields = [
    {
      ownerId: group.productGid,
      namespace: 'leafer',
      key: 'content_db',
      type: 'json',
      value: JSON.stringify(product.object)
    }
  ];

  var cfg = readConfig_();
  if (truthy_(cfg.SYNC_FAQ)) {
    var faq = readSheetObjects_(LS.SHEET_FAQ).filter(function(item) {
      return String(item['Produkt-ID'] || '') === group.productKey &&
        String(item.Sichtbar || '').toLowerCase() === 'ja';
    });
    if (faq.length) {
      metafields.push({
        ownerId: group.productGid,
        namespace: 'leafer',
        key: 'faq',
        type: 'json',
        value: JSON.stringify(faq)
      });
    }
  }

  if (truthy_(cfg.SYNC_SEO)) {
    var seoRows = readSheetObjects_(LS.SHEET_SEO).filter(function(item) {
      return String(item['Referenz-ID'] || '') === group.productKey;
    });
    if (seoRows.length) {
      metafields.push({
        ownerId: group.productGid,
        namespace: 'leafer',
        key: 'seo_payload',
        type: 'json',
        value: JSON.stringify(seoRows[0])
      });
    }
  }

  if (truthy_(cfg.SYNC_CROSS_SELLING)) {
    var crossRows = readSheetObjects_(LS.SHEET_CROSS).filter(function(item) {
      return String(item.Quellprodukt || '') === group.productKey &&
        String(item.Sichtbar || '').toLowerCase() === 'ja';
    });
    if (crossRows.length) {
      var gidByProductKey = productGidByProductKey_();
      var targetGids = [];
      crossRows.forEach(function(item) {
        var gid = gidByProductKey[String(item.Zielprodukt || '')];
        if (gid && targetGids.indexOf(gid) === -1) targetGids.push(gid);
      });

      metafields.push({
        ownerId: group.productGid,
        namespace: 'leafer',
        key: 'cross_sell_payload',
        type: 'json',
        value: JSON.stringify(crossRows)
      });
      if (targetGids.length) {
        metafields.push({
          ownerId: group.productGid,
          namespace: 'leafer',
          key: 'cross_sell_products',
          type: 'list.product_reference',
          value: JSON.stringify(targetGids)
        });
      }
    }
  }

  setMetafields_(metafields);
}

function syncVariantPrices_(group) {
  var variants = group.items
    .filter(function(item) {
      return item.approveContent &&
        isGid_(item.variantGid, 'ProductVariant') &&
        Number(item.price) > 0;
    })
    .map(function(item) {
      return {
        id: item.variantGid,
        price: Number(item.price).toFixed(2)
      };
    });

  if (!variants.length) return;
  if (variants.length > LS.MAX_ROWS_HARD) {
    throw new Error('Mehr als 100 Varianten in einem Lauf sind nicht zulässig.');
  }

  var mutation =
    'mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {' +
    ' productVariantsBulkUpdate(productId: $productId, variants: $variants) {' +
    '  productVariants { id price }' +
    '  userErrors { field message }' +
    ' }' +
    '}';
  var data = shopifyGraphql_(mutation, {
    productId: group.productGid,
    variants: variants
  });
  assertUserErrors_(data.productVariantsBulkUpdate.userErrors, 'productVariantsBulkUpdate');
}

function setMetafields_(metafields) {
  if (!metafields.length) return;
  if (metafields.length > 25) throw new Error('metafieldsSet erlaubt in diesem Sync maximal 25 Werte.');

  var mutation =
    'mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {' +
    ' metafieldsSet(metafields: $metafields) {' +
    '  metafields { id namespace key type }' +
    '  userErrors { field message code }' +
    ' }' +
    '}';
  var data = shopifyGraphql_(mutation, { metafields: metafields });
  assertUserErrors_(data.metafieldsSet.userErrors, 'metafieldsSet');
}

function findVariantsBySku_(sku) {
  var query =
    'query FindVariant($query: String!) {' +
    ' productVariants(first: 10, query: $query) {' +
    '  nodes { id sku product { id handle title status } inventoryItem { id } }' +
    ' }' +
    '}';
  var search = 'sku:"' + escapeSearch_(sku) + '"';
  return shopifyGraphql_(query, { query: search }).productVariants.nodes || [];
}

function findProductsByHandle_(handle) {
  var query =
    'query FindProduct($query: String!) {' +
    ' products(first: 10, query: $query) {' +
    '  nodes { id handle title status }' +
    ' }' +
    '}';
  var search = 'handle:"' + escapeSearch_(handle) + '"';
  return shopifyGraphql_(query, { query: search }).products.nodes || [];
}

function shopifyGraphql_(query, variables) {
  var props = PropertiesService.getScriptProperties();
  var domain = normalizeDomain_(props.getProperty('SHOPIFY_SHOP_DOMAIN'));
  var token = String(props.getProperty('SHOPIFY_ACCESS_TOKEN') || '').trim();
  if (!domain || !token) {
    throw new Error('Shopify-Verbindung fehlt. Menü "Verbindung einrichten" verwenden.');
  }

  var cfg = readConfig_();
  var version = String(cfg.API_VERSION || LS.API_VERSION);
  var url = 'https://' + domain + '/admin/api/' + version + '/graphql.json';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Shopify-Access-Token': token
    },
    payload: JSON.stringify({
      query: query,
      variables: variables || {}
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  var body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error('Shopify-Antwort ist kein JSON (HTTP ' + code + ').');
  }

  if (code < 200 || code >= 300) {
    throw new Error('Shopify HTTP ' + code + ': ' + truncate_(text, 500));
  }
  if (body.errors && body.errors.length) {
    throw new Error('Shopify GraphQL: ' + body.errors.map(function(item) {
      return item.message;
    }).join(' | '));
  }
  return body.data;
}

function readConfig_() {
  if (LS_CONFIG_CACHE) return LS_CONFIG_CACHE;
  var sheet = requiredSheet_(LS.SHEET_CONFIG);
  var values = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();
    if (key) config[key] = values[i][1];
  }
  LS_CONFIG_CACHE = config;
  return LS_CONFIG_CACHE;
}

function writeConfigValue_(key, value) {
  var sheet = requiredSheet_(LS.SHEET_CONFIG);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      LS_CONFIG_CACHE = null;
      return;
    }
  }
  sheet.appendRow([key, value, 'Automatisch vom Apps Script gesetzt', 'System']);
  LS_CONFIG_CACHE = null;
}

function findSourceProduct_(productKey) {
  var sheet = requiredSheet_(LS.SHEET_PRODUCTS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = uniqueHeaders_(values[0]);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === productKey) {
      return {
        row: values[i],
        object: objectFromRow_(headers, values[i])
      };
    }
  }
  return null;
}

function readSheetObjects_(sheetName) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (!values.length || !values[0].some(function(value) { return String(value || '').trim(); })) {
    return [];
  }
  var headers = uniqueHeaders_(values[0]);
  return values.slice(1)
    .filter(function(row) {
      return row.some(function(value) { return value !== '' && value !== null; });
    })
    .map(function(row) {
      return objectFromRow_(headers, row);
    });
}

function uniqueHeaders_(headers) {
  var counts = {};
  return headers.map(function(header, index) {
    var base = String(header || '').trim() || 'Spalte_' + (index + 1);
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : base + '_' + counts[base];
  });
}

function objectFromRow_(headers, row) {
  var object = {};
  headers.forEach(function(header, index) {
    if (row[index] !== '' && row[index] !== null && row[index] !== undefined) {
      object[header] = row[index];
    }
  });
  return object;
}

function productGidByProductKey_() {
  var values = requiredSheet_(LS.SHEET_SYNC).getDataRange().getValues();
  var sets = {};
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][LS.COL.PRODUCT_KEY] || '').trim();
    var gid = String(values[i][LS.COL.PRODUCT_GID] || '').trim();
    if (!key || !isGid_(gid, 'Product')) continue;
    if (!sets[key]) sets[key] = {};
    sets[key][gid] = true;
  }
  var map = {};
  Object.keys(sets).forEach(function(key) {
    var gids = Object.keys(sets[key]);
    if (gids.length === 1) map[key] = gids[0];
  });
  return map;
}

function buildProductDescriptionHtml_(row) {
  var shortDescription = String(row[24] || '').trim();
  var longDescription = String(row[25] || '').trim();
  var usps = [row[26], row[27], row[28], row[29]].filter(function(value) {
    return String(value || '').trim();
  });
  var idealFor = String(row[42] || '').trim();
  var application = String(row[43] || '').trim();

  var html = [];
  if (shortDescription) html.push('<p><strong>' + escapeHtml_(shortDescription) + '</strong></p>');
  if (longDescription) html.push('<p>' + escapeHtml_(longDescription) + '</p>');
  if (usps.length) {
    html.push('<h3>Vorteile</h3><ul>' + usps.map(function(value) {
      return '<li>' + escapeHtml_(String(value)) + '</li>';
    }).join('') + '</ul>');
  }
  if (idealFor) html.push('<h3>Ideal für</h3><p>' + escapeHtml_(idealFor) + '</p>');
  if (application) html.push('<h3>Anwendung</h3><p>' + escapeHtml_(application) + '</p>');
  return html.join('');
}

function requiredSheet_(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error('Pflichtblatt fehlt: ' + name);
  return sheet;
}

function enforceLiveSafety_(cfg) {
  if (String(cfg.MODE || '').toUpperCase() !== 'LIVE') {
    throw new Error('Shopify_Config MODE steht nicht auf LIVE. Der Standard bleibt DRY_RUN.');
  }
  if (!truthy_(cfg.UPDATE_ONLY)) {
    throw new Error('UPDATE_ONLY muss TRUE sein.');
  }
  if (truthy_(cfg.ALLOW_PUBLISH)) {
    throw new Error('ALLOW_PUBLISH muss FALSE sein.');
  }
  if (Number(cfg.MAX_ROWS_PER_RUN || 0) > LS.MAX_ROWS_HARD) {
    throw new Error('MAX_ROWS_PER_RUN darf 100 nicht überschreiten.');
  }
}

function confirmLive_(message) {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt(
    'LIVE-Sync bestätigen',
    message + '\n\nZum Bestätigen exakt LIVE eingeben:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK ||
      String(prompt.getResponseText() || '').trim() !== 'LIVE') {
    throw new Error('Live-Sync abgebrochen.');
  }
}

function updateRowResult_(sheetRow, message, timestamp) {
  requiredSheet_(LS.SHEET_SYNC)
    .getRange(sheetRow, LS.COL.LAST_RESULT + 1, 1, 2)
    .setValues([[message, timestamp]]);
}

function appendLog_(mode, action, productKey, handle, sku, shopifyId, status, message, hash) {
  requiredSheet_(LS.SHEET_LOG).appendRow([
    new Date(),
    mode,
    action,
    productKey,
    handle,
    sku,
    shopifyId,
    status,
    message,
    hash
  ]);
}

function assertUserErrors_(errors, operation) {
  if (!errors || !errors.length) return;
  throw new Error(operation + ': ' + errors.map(function(error) {
    var field = error.field ? error.field.join('.') + ': ' : '';
    return field + error.message;
  }).join(' | '));
}

function normalizeDomain_(value) {
  var domain = String(value || '').trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) ? domain : '';
}

function escapeSearch_(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isGid_(value, type) {
  return String(value || '').indexOf('gid://shopify/' + type + '/') === 0;
}

function truthy_(value) {
  if (value === true) return true;
  return ['TRUE', 'JA', 'YES', '1'].indexOf(String(value || '').trim().toUpperCase()) >= 0;
}

function putNonBlank_(object, key, value) {
  if (value !== '' && value !== null && value !== undefined) {
    object[key] = String(value);
  }
}

function hashObject_(object) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(object),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function truncate_(value, maxLength) {
  var text = String(value || '');
  return text.length <= maxLength ? text : text.slice(0, maxLength) + '…';
}
