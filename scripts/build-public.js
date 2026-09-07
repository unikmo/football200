const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const env = process.env.VERCEL_ENV || 'development';
const releaseEnabled = process.env.PUBLIC_RELEASE_ENABLED === 'true';
const indexingEnabled = process.env.PUBLIC_INDEXING_ENABLED === 'true';
const legalApproved = process.env.LEGAL_RELEASE_APPROVED === 'true';
const paymentsApproved = process.env.PAYMENTS_RELEASE_APPROVED === 'true';
const minorDataApproved = process.env.MINOR_DATA_RELEASE_APPROVED === 'true';
const operationsApproved = process.env.PRODUCTION_OPERATIONS_ENABLED === 'true';
const analyticsApproved = process.env.ANALYTICS_RELEASE_APPROVED === 'true';
const analyticsConsentReady = process.env.ANALYTICS_CONSENT_READY === 'true';
const gtmId = String(process.env.PUBLIC_GTM_ID || '').trim();
const validGtmId = /^GTM-[A-Z0-9]+$/i.test(gtmId);
const productionRuntime = env === 'production' && releaseEnabled && legalApproved;
const canIndex = productionRuntime && indexingEnabled;
const analyticsNetworkEnabled = canIndex && analyticsApproved && analyticsConsentReady && validGtmId;
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'football200.vercel.app';
const base = /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `https://${host}`;

const requiredLegalFiles = ['impressum.html', 'datenschutz.html'];
const legalPlaceholderPatterns = [/REQUIRES QUALIFIED LEGAL REVIEW/i, /NICHT PRODUKTIONSFREIGEGEBEN/i, /Release Gate/i];
function assertLegalReleaseSurfaces() {
  if (!productionRuntime) return;
  for (const relative of requiredLegalFiles) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) throw new Error(`LEGAL_RELEASE_SURFACE_MISSING:${relative}`);
    const html = fs.readFileSync(file, 'utf8');
    if (!/<h1\b[^>]*>[^<]+<\/h1>/i.test(html) || legalPlaceholderPatterns.some(pattern => pattern.test(html))) {
      throw new Error(`LEGAL_RELEASE_SURFACE_NOT_READY:${relative}`);
    }
  }
}
assertLegalReleaseSurfaces();

const publicRoutes = [
  ['index.html', '/'],['verein.html', '/verein'],['unternehmen.html', '/unternehmen'],['sponsoren.html', '/sponsoren'],['club-sponsors.html', '/club-sponsors'],['kinder-familien.html', '/kinder-familien'],['stadion.html', '/stadion'],['sponsoren-finden-verein.html', '/sponsoren-finden-verein'],['sponsoring-sportverein.html', '/sponsoring-sportverein'],['sponsoring-fussballverein.html', '/sponsoring-fussballverein'],['sportsponsoring-lokale-unternehmen.html', '/sportsponsoring-lokale-unternehmen'],['ehrenamt-sportverein.html', '/ehrenamt-sportverein'],['sponsoring-kleine-vereine.html', '/sponsoring-kleine-vereine'],['sponsoring-ideen-verein.html', '/sponsoring-ideen-verein'],['sponsoring-verein-kosten.html', '/sponsoring-verein-kosten'],
].filter(([file]) => fs.existsSync(path.join(root, file)));
const publicFiles = new Map(publicRoutes);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{if(entry.name==='node_modules'||entry.name==='.git')return[];const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
function robotsMeta(value){return `<meta name="robots" content="${value}">`}
function setRobots(html,value){const tag=robotsMeta(value);if(/<meta\s+name=["']robots["'][^>]*>/i.test(html))return html.replace(/<meta\s+name=["']robots["'][^>]*>/i,tag);return html.replace(/<head>/i,`<head>${tag}`)}
function upsertCanonical(html,url){const tag=`<link rel="canonical" href="${url}">`;if(/<link\s+rel=["']canonical["'][^>]*>/i.test(html))return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i,tag);return html.replace(/<\/head>/i,`${tag}</head>`)}
function addStructuredData(html,route){if(html.includes('data-f200-schema'))return html;const payload={'@context':'https://schema.org','@type':route==='/'?'WebSite':'WebPage',name:route==='/'?'Sponsor a Young Fan':undefined,url:`${base}${route}`,inLanguage:'de-DE',about:{'@type':'Service',name:'Sponsor a Young Fan',serviceType:'Lokales Fußball-Sponsoringprogramm für junge Fans',areaServed:{'@type':'Country',name:'Deutschland'}}};const clean=JSON.parse(JSON.stringify(payload));return html.replace(/<\/head>/i,`<script type="application/ld+json" data-f200-schema>${JSON.stringify(clean)}</script></head>`)}
function addLocalAnalytics(html){if(html.includes('data-f200-analytics'))return html;return html.replace(/<\/body>/i,'<script src="/analytics.js" defer data-f200-analytics></script></body>')}
function addAnalyticsConfig(html){if(!analyticsNetworkEnabled||html.includes('data-f200-analytics-config'))return html;const config={networkEnabled:true,gtmId,consentVersion:1};const tag=`<script data-f200-analytics-config>window.F200AnalyticsConfig=Object.freeze(${JSON.stringify(config)});</script>`;return html.replace(/<\/head>/i,`${tag}</head>`)}
function productionCopy(relative,html){if(!productionRuntime)return html;if(relative==='sponsor/checkout.html'&&paymentsApproved){html=html.replace('Stripe Sandbox Checkout · Preview only','Sicher bezahlen · Stripe');html=html.replace('Preview/Sandbox. Football200 speichert keine Kartendaten.','Football200 speichert keine Kartendaten.')}if(relative==='sponsor/erfolg.html'&&paymentsApproved)html=html.replace('Stripe Test Checkout · Preview only','Sponsoring · Zahlung bestätigt');if(relative==='family-plus.html'&&paymentsApproved&&minorDataApproved){html=html.replace('Family Plus · Preview','Family Plus · Sicher bezahlen');html=html.replace('Im aktuellen Preview dient der Pass-Referenzwert ausschließlich dem Test des Zahlungs- und Fulfilment-Flows.','Der Pass-Referenzwert bestätigt die Berechtigung für Family Plus.')}if(operationsApproved){if(relative==='admin/index.html'){html=html.replace('Football200 Admin · Preview','Football200 Admin · Operations').replace('Football200 Admin · Preview only · protected staging environment','Football200 Admin · geschützter Bereich').replace('Firebase Preview','Systemstatus').replace('<strong>Staging-Modus.</strong> Zahlungsstatus ist bewusst schreibgeschützt. Zertifikatstatus kann in diesem Preview kontrolliert fortgeschrieben werden. Produktionsbetrieb bleibt deaktiviert.','<strong>Produktionsmodus.</strong> Administrative Änderungen werden ausschließlich über die geschützten Operations-Endpunkte verarbeitet.')}if(relative==='admin/commercial.html')html=html.replace('Football200 Sponsor Operations · Preview only','Football200 Sponsor Operations · geschützter Bereich');if(relative==='admin/email.html')html=html.replace('Football200 Email Delivery · Preview','Football200 Email Delivery · geschützter Bereich')}return html}

for(const file of walk(root).filter(file=>file.endsWith('.html'))){const relative=path.relative(root,file).replace(/\\/g,'/');let html=fs.readFileSync(file,'utf8');const route=publicFiles.get(relative);if(canIndex&&route){html=setRobots(html,'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');html=upsertCanonical(html,`${base}${route}`);html=addStructuredData(html,route);html=html.replace(/<div class="demo-bar">Live-Demo · nicht veröffentlicht<\/div>/g,'')}else{html=setRobots(html,'noindex,nofollow,noarchive')}if(route){html=addLocalAnalytics(html);html=addAnalyticsConfig(html)}html=productionCopy(relative,html);fs.writeFileSync(file,html)}
const robots=canIndex?`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /programme-test/\nDisallow: /guardian/\nDisallow: /sponsor/\nDisallow: /family-plus/\nSitemap: ${base}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';fs.writeFileSync(path.join(root,'robots.txt'),robots);
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicRoutes.map(([,route])=>`  <url><loc>${base}${route}</loc></url>`).join('\n')}\n</urlset>\n`;fs.writeFileSync(path.join(root,'sitemap.xml'),sitemap);
const llms=`# Sponsor a Young Fan / Football200\n\nStatus: ${canIndex?'public production release':'non-indexed staging/release gate'}\nMarket: Germany\nCategory: community and lower-league football\nPrimary audience: football clubs\n\n## Product\nSponsor a Young Fan helps clubs gain local sponsors and young fans with low administrative burden. Local companies sponsor programme places at a fixed EUR 99 per child per season. Sponsorship levels are 1, 3, 5 or 10 children. A club can release at most 200 sponsored places per season.\n\nChildren apply online or through participating schools. The child is the central participant. Parent or guardian confirmation follows selection. Real minor-data flows remain subject to the production legal and safeguarding gate.\n\n## Main public routes\n${publicRoutes.map(([,route])=>`- ${base}${route}`).join('\n')}\n\n## Product separation\nRunYourEvent is a separate optional service for volunteer and matchday support. It is not Football200/Sponsor a Young Fan.\n`;fs.writeFileSync(path.join(root,'llms.txt'),llms);
console.log(JSON.stringify({env,releaseEnabled,indexingEnabled,legalApproved,paymentsApproved,minorDataApproved,operationsApproved,canIndex,analyticsApproved,analyticsConsentReady,analyticsNetworkEnabled,legalSurfacesValidated:productionRuntime,publicPages:publicRoutes.length}));
