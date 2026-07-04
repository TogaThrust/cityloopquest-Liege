/**
 * Formulaire "Proposer un POI" (soumission staff + traduction serveur).
 */
(function () {
  "use strict";

  const FALLBACK = "fr";
  const SUPPORTED = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "zh", "ja"];
  const CITY_CONFIG = window.CLQ_POI_CITY_CONFIG || {};
  const DEFAULT_CENTER = CITY_CONFIG.center || { lat: 50.6451, lng: 5.5737 };
  const CITY_KEY = CITY_CONFIG.cityKey || "liege";
  const PROPOSAL_MAX_RADIUS_KM = Number(CITY_CONFIG.proposalMaxRadiusKm) || 50;

  const texts = {
    proposeBtn: {
      fr: "Proposer un POI", en: "Suggest a POI", nl: "POI voorstellen", de: "POI vorschlagen",
      it: "Proponi un POI", es: "Proponer un POI", pl: "Zaproponuj POI", ar: "اقتراح نقطة اهتمام",
      zh: "推荐兴趣点", ja: "スポットを提案",
    },
    modalTitle: {
      fr: "Proposer un point d'intérêt", en: "Suggest a point of interest", nl: "Een bezienswaardigheid voorstellen",
      de: "Einen interessanten Ort vorschlagen", it: "Proponi un punto di interesse", es: "Proponer un punto de interés",
      pl: "Zaproponuj punkt zainteresowania", ar: "اقتراح نقطة اهتمام", zh: "推荐一个兴趣点", ja: "見どころを提案",
    },
    nameLabel: { fr: "Nom du lieu", en: "Place name", nl: "Naam van de plaats", de: "Name des Ortes", it: "Nome del luogo", es: "Nombre del lugar", pl: "Nazwa miejsca", ar: "اسم المكان", zh: "地点名称", ja: "場所名" },
    latLabel: { fr: "Latitude", en: "Latitude", nl: "Breedtegraad", de: "Breitengrad", it: "Latitudine", es: "Latitud", pl: "Szerokość geograficzna", ar: "خط العرض", zh: "纬度", ja: "緯度" },
    lngLabel: { fr: "Longitude", en: "Longitude", nl: "Lengtegraad", de: "Längengrad", it: "Longitudine", es: "Longitud", pl: "Długość geograficzna", ar: "خط الطول", zh: "经度", ja: "経度" },
    descLabel: { fr: "Description courte", en: "Short description", nl: "Korte beschrijving", de: "Kurze Beschreibung", it: "Breve descrizione", es: "Descripción breve", pl: "Krótki opis", ar: "وصف قصير", zh: "简短描述", ja: "短い説明" },
    emailLabel: { fr: "Votre e-mail (optionnel)", en: "Your email (optional)", nl: "Uw e-mail (optioneel)", de: "Ihre E-Mail (optional)", it: "La tua e-mail (facoltativa)", es: "Tu e-mail (opcional)", pl: "Twój e-mail (opcjonalnie)", ar: "بريدك الإلكتروني (اختياري)", zh: "你的邮箱（可选）", ja: "メールアドレス（任意）" },
    photoLabel: { fr: "Photo obligatoire (JPG, PNG ou HEIC)", en: "Photo required (JPG, PNG or HEIC)", nl: "Foto verplicht (JPG, PNG of HEIC)", de: "Foto erforderlich (JPG, PNG oder HEIC)", it: "Foto obbligatoria (JPG, PNG o HEIC)", es: "Foto obligatoria (JPG, PNG o HEIC)", pl: "Zdjęcie wymagane (JPG, PNG lub HEIC)", ar: "صورة مطلوبة (JPG أو PNG أو HEIC)", zh: "必填照片（JPG、PNG 或 HEIC）", ja: "写真必須（JPG、PNG、HEIC）" },
    pickMap: { fr: "Choisir sur la carte", en: "Pick on map", nl: "Kies op de kaart", de: "Auf Karte wählen", it: "Scegli sulla mappa", es: "Elegir en el mapa", pl: "Wybierz na mapie", ar: "اختر على الخريطة", zh: "在地图上选择", ja: "地図で選択" },
    myPos: { fr: "Ma position", en: "My location", nl: "Mijn locatie", de: "Mein Standort", it: "La mia posizione", es: "Mi ubicación", pl: "Moja lokalizacja", ar: "موقعي", zh: "我的位置", ja: "現在地" },
    submit: { fr: "Envoyer pour validation", en: "Submit for review", nl: "Verzenden ter controle", de: "Zur Prüfung senden", it: "Invia per revisione", es: "Enviar para revisión", pl: "Wyślij do sprawdzenia", ar: "إرسال للمراجعة", zh: "提交审核", ja: "確認のため送信" },
    cancel: { fr: "Annuler", en: "Cancel", nl: "Annuleren", de: "Abbrechen", it: "Annulla", es: "Cancelar", pl: "Anuluj", ar: "إلغاء", zh: "取消", ja: "キャンセル" },
    hintReview: {
      fr: "Proposition pour le mode POI Explorer (pas les parcours guidés). Zone acceptée : 50 km autour du centre de la ville. Traduction en 10 langues après validation.",
      en: "For POI Explorer mode only (not guided tours). Accepted area: 50 km around the city center. Translated into 10 languages after approval.",
      nl: "Voor de POI Explorer-modus (niet voor begeleide parcoursen). Toegestaan gebied: 50 km rond het stadscentrum. Na goedkeuring in 10 talen vertaald.",
      de: "Für den POI-Explorer-Modus (nicht für geführte Parcours). Zulässiger Bereich: 50 km um das Stadtzentrum. Nach Prüfung in 10 Sprachen übersetzt.",
      it: "Per la modalità POI Explorer (non i percorsi guidati). Area ammessa: 50 km dal centro città. Tradotto in 10 lingue dopo la verifica.",
      es: "Para el modo POI Explorer (no los recorridos guiados). Zona aceptada: 50 km alrededor del centro. Traducido a 10 idiomas tras la validación.",
      pl: "Dla trybu POI Explorer (nie tras guidowanych). Dozwolony obszar: 50 km od centrum miasta. Po zatwierdzeniu tłumaczenie na 10 języków.",
      ar: "للوضع POI Explorer (وليس المسارات المرشدة). المنطقة المقبولة: 50 كم حول مركز المدينة. يُترجم إلى 10 لغات بعد الموافقة.",
      zh: "仅供 POI Explorer 模式（非导览路线）。接受范围：市中心 50 公里内。审核后翻译成 10 种语言。",
      ja: "POI Explorer 用（ガイド付きコースではありません）。市区中心から 50 km 以内。承認後に 10 言語へ翻訳されます。",
    },
    sending: { fr: "Envoi...", en: "Sending...", nl: "Verzenden...", de: "Wird gesendet...", it: "Invio...", es: "Enviando...", pl: "Wysyłanie...", ar: "جارٍ الإرسال...", zh: "正在发送...", ja: "送信中..." },
    success: {
      fr: "Merci ! Votre proposition a été envoyée. Elle apparaîtra sur la carte après validation.",
      en: "Thank you! Your suggestion was sent. It will appear on the map after approval.",
      nl: "Dank u! Uw voorstel is verzonden. Het verschijnt na goedkeuring op de kaart.",
      de: "Danke! Ihr Vorschlag wurde gesendet. Er erscheint nach Prüfung auf der Karte.",
      it: "Grazie! La proposta è stata inviata. Apparirà sulla mappa dopo la verifica.",
      es: "¡Gracias! Tu propuesta se ha enviado. Aparecerá en el mapa tras su validación.",
      pl: "Dziękujemy! Propozycja została wysłana. Pojawi się na mapie po zatwierdzeniu.",
      ar: "شكرًا! تم إرسال اقتراحك وسيظهر على الخريطة بعد الموافقة.",
      zh: "谢谢！你的建议已发送，审核后会显示在地图上。",
      ja: "ありがとうございます！提案を送信しました。承認後に地図に表示されます。",
    },
    errGeneric: { fr: "Envoi impossible. Réessayez plus tard.", en: "Could not send. Try again later.", nl: "Verzenden lukt niet. Probeer later opnieuw.", de: "Senden nicht möglich. Versuchen Sie es später erneut.", it: "Invio impossibile. Riprova più tardi.", es: "No se pudo enviar. Inténtalo más tarde.", pl: "Nie można wysłać. Spróbuj później.", ar: "تعذر الإرسال. حاول لاحقًا.", zh: "无法发送。请稍后再试。", ja: "送信できません。後でもう一度お試しください。" },
    errSmtp: { fr: "Serveur d'envoi non configuré.", en: "Mail server not configured.", nl: "Mailserver niet geconfigureerd.", de: "Mailserver nicht konfiguriert.", it: "Server mail non configurato.", es: "Servidor de correo no configurado.", pl: "Serwer poczty nie jest skonfigurowany.", ar: "خادم البريد غير مهيأ.", zh: "邮件服务器未配置。", ja: "メールサーバーが設定されていません。" },
    errRequired: { fr: "Remplissez tous les champs obligatoires.", en: "Please fill all required fields.", nl: "Vul alle verplichte velden in.", de: "Bitte alle Pflichtfelder ausfüllen.", it: "Compila tutti i campi obbligatori.", es: "Completa todos los campos obligatorios.", pl: "Wypełnij wszystkie wymagane pola.", ar: "املأ جميع الحقول المطلوبة.", zh: "请填写所有必填字段。", ja: "必須項目をすべて入力してください。" },
    errDescShort: { fr: "La description doit contenir au moins 10 caractères.", en: "Description must be at least 10 characters.", nl: "De beschrijving moet minstens 10 tekens bevatten.", de: "Die Beschreibung muss mindestens 10 Zeichen enthalten.", it: "La descrizione deve contenere almeno 10 caratteri.", es: "La descripción debe tener al menos 10 caracteres.", pl: "Opis musi mieć co najmniej 10 znaków.", ar: "يجب أن يتكون الوصف من 10 أحرف على الأقل.", zh: "描述至少需要 10 个字符。", ja: "説明は10文字以上で入力してください。" },
    errTimeout: { fr: "Délai dépassé. Vérifiez votre connexion ou réessayez.", en: "Request timed out. Check your connection or try again.", nl: "Time-out. Controleer uw verbinding of probeer opnieuw.", de: "Zeitüberschreitung. Verbindung prüfen oder erneut versuchen.", it: "Timeout. Controlla la connessione o riprova.", es: "Tiempo agotado. Comprueba la conexión o inténtalo de nuevo.", pl: "Przekroczono limit czasu. Sprawdź połączenie lub spróbuj ponownie.", ar: "انتهت المهلة. تحقق من الاتصال أو أعد المحاولة.", zh: "请求超时。请检查网络后重试。", ja: "タイムアウトしました。接続を確認して再試行してください。" },
    errBadResponse: { fr: "Réponse serveur invalide. Utilisez la version déployée sur Netlify ou netlify dev.", en: "Invalid server response. Use the Netlify deployment or netlify dev.", nl: "Ongeldig serverantwoord. Gebruik de Netlify-versie of netlify dev.", de: "Ungültige Serverantwort. Nutzen Sie das Netlify-Deployment oder netlify dev.", it: "Risposta server non valida. Usa il deploy Netlify o netlify dev.", es: "Respuesta del servidor no válida. Usa el despliegue en Netlify o netlify dev.", pl: "Nieprawidłowa odpowiedź serwera. Użyj wersji Netlify lub netlify dev.", ar: "استجابة خادم غير صالحة. استخدم نسخة Netlify أو netlify dev.", zh: "服务器响应无效。请使用 Netlify 部署或 netlify dev。", ja: "サーバー応答が無効です。Netlify デプロイまたは netlify dev を使用してください。" },
    errFunctionMissing: {
      fr: "Service d'envoi indisponible (fonction Netlify absente). Réessayez après le prochain déploiement.",
      en: "Submission service unavailable (Netlify function missing). Try again after the next deployment.",
      nl: "Verzendservice niet beschikbaar (Netlify-functie ontbreekt). Probeer opnieuw na de volgende deploy.",
      de: "Sende-Dienst nicht verfügbar (Netlify-Funktion fehlt). Nach dem nächsten Deploy erneut versuchen.",
      it: "Servizio di invio non disponibile (funzione Netlify assente). Riprova dopo il prossimo deploy.",
      es: "Servicio de envío no disponible (falta la función Netlify). Vuelve a intentarlo tras el próximo despliegue.",
      pl: "Usługa wysyłki niedostępna (brak funkcji Netlify). Spróbuj ponownie po następnym wdrożeniu.",
      ar: "خدمة الإرسال غير متاحة (دالة Netlify مفقودة). أعد المحاولة بعد النشر التالي.",
      zh: "提交服务不可用（缺少 Netlify 函数）。请在下次部署后重试。",
      ja: "送信サービスが利用できません（Netlify 関数がありません）。次のデプロイ後に再試行してください。",
    },
    pickPhoto: { fr: "Choisir une photo", en: "Choose a photo", nl: "Foto kiezen", de: "Foto wählen", it: "Scegli una foto", es: "Elegir una foto", pl: "Wybierz zdjęcie", ar: "اختر صورة", zh: "选择照片", ja: "写真を選ぶ" },
    errPhotoRequired: { fr: "Photo requise (JPG, PNG ou HEIC).", en: "Photo required (JPG, PNG or HEIC).", nl: "Foto verplicht (JPG, PNG of HEIC).", de: "Foto erforderlich (JPG, PNG oder HEIC).", it: "Foto obbligatoria (JPG, PNG o HEIC).", es: "Foto obligatoria (JPG, PNG o HEIC).", pl: "Zdjęcie wymagane (JPG, PNG lub HEIC).", ar: "الصورة مطلوبة (JPG أو PNG أو HEIC).", zh: "需要照片（JPG、PNG 或 HEIC）。", ja: "写真が必要です（JPG、PNG、HEIC）。" },
    errPhotoConvert: { fr: "Impossible de lire cette photo. Essayez JPG ou une autre image.", en: "Could not read this photo. Try JPG or another image.", nl: "Kan deze foto niet lezen. Probeer JPG of een andere afbeelding.", de: "Foto konnte nicht gelesen werden. Versuchen Sie JPG oder ein anderes Bild.", it: "Impossibile leggere la foto. Prova JPG o un'altra immagine.", es: "No se pudo leer la foto. Prueba JPG u otra imagen.", pl: "Nie można odczytać zdjęcia. Spróbuj JPG lub inny obraz.", ar: "تعذر قراءة الصورة. جرّب JPG أو صورة أخرى.", zh: "无法读取该照片。请尝试 JPG 或其他图片。", ja: "写真を読み取れません。JPG など別の画像をお試しください。" },
    errCoordsInvalid: { fr: "Latitude ou longitude invalide.", en: "Invalid latitude or longitude.", nl: "Ongeldige breedte- of lengtegraad.", de: "Ungültiger Breiten- oder Längengrad.", it: "Latitudine o longitudine non valida.", es: "Latitud o longitud inválida.", pl: "Nieprawidłowa szerokość lub długość geograficzna.", ar: "خط العرض أو الطول غير صالح.", zh: "纬度或经度无效。", ja: "緯度または経度が無効です。" },
    errCoordsOutOfArea: {
      fr: "Ce point est à plus de {radius} km du centre de {city}. Les propositions POI Explorer doivent rester dans ce rayon (elles ne concernent pas les parcours guidés).",
      en: "This point is more than {radius} km from the center of {city}. POI Explorer suggestions must stay within this radius (they are not for guided tours).",
      nl: "Dit punt ligt meer dan {radius} km van het centrum van {city}. POI Explorer-voorstellen moeten binnen deze straal blijven (niet voor begeleide parcoursen).",
      de: "Dieser Punkt liegt mehr als {radius} km vom Zentrum von {city} entfernt. POI-Explorer-Vorschläge müssen in diesem Radius bleiben (nicht für geführte Parcours).",
      it: "Questo punto è a più di {radius} km dal centro di {city}. Le proposte POI Explorer devono restare in questo raggio (non riguardano i percorsi guidati).",
      es: "Este punto está a más de {radius} km del centro de {city}. Las propuestas POI Explorer deben permanecer en este radio (no son para recorridos guiados).",
      pl: "Ten punkt jest oddalony o więcej niż {radius} km od centrum {city}. Propozycje POI Explorer muszą pozostać w tym promieniu (nie dotyczą tras guidowanych).",
      ar: "هذه النقطة على بعد أكثر من {radius} كم من مركز {city}. يجب أن تبقى اقتراحات POI Explorer ضمن هذا النطاق (وليست للمسارات المرشدة).",
      zh: "该地点距 {city} 中心超过 {radius} 公里。POI Explorer 建议须在此半径内（不用于导览路线）。",
      ja: "この地点は {city} の中心から {radius} km を超えています。POI Explorer の提案はこの半径内である必要があります（ガイド付きコース用ではありません）。",
    },
    pickMapActive: { fr: "Cliquez sur la carte ci-dessous pour placer le point.", en: "Click the map below to set the location.", nl: "Klik op de kaart hieronder om de locatie te plaatsen.", de: "Klicken Sie auf die Karte unten, um den Punkt zu setzen.", it: "Clicca sulla mappa qui sotto per posizionare il punto.", es: "Haz clic en el mapa inferior para colocar el punto.", pl: "Kliknij mapę poniżej, aby ustawić punkt.", ar: "انقر على الخريطة أدناه لتحديد النقطة.", zh: "点击下方地图放置地点。", ja: "下の地図をクリックして地点を設定してください。" },
    pickMapUnavailable: { fr: "Carte indisponible. Attendez le chargement ou utilisez Ma position.", en: "Map unavailable. Wait for loading or use My location.", nl: "Kaart niet beschikbaar. Wacht tot ze geladen is of gebruik Mijn locatie.", de: "Karte nicht verfügbar. Warten Sie auf das Laden oder nutzen Sie Mein Standort.", it: "Mappa non disponibile. Attendi il caricamento o usa La mia posizione.", es: "Mapa no disponible. Espera a que cargue o usa Mi ubicación.", pl: "Mapa niedostępna. Poczekaj na załadowanie albo użyj Mojej lokalizacji.", ar: "الخريطة غير متاحة. انتظر التحميل أو استخدم موقعي.", zh: "地图不可用。请等待加载或使用我的位置。", ja: "地図を利用できません。読み込みを待つか現在地を使用してください。" },
  };

  let mapPickListener = null;
  let miniMap = null;
  let miniMapMarker = null;
  let selectedPhotoFile = null;

  function lang() {
    let l = (localStorage.getItem("selectedLanguage") || FALLBACK).toLowerCase();
    if (l === "cn") l = "zh";
    if (l === "jp") l = "ja";
    return SUPPORTED.includes(l) ? l : FALLBACK;
  }

  function t(key) {
    const d = texts[key];
    if (!d) return "";
    return d[lang()] || d[FALLBACK] || "";
  }

  function cityLabel() {
    return CITY_CONFIG.label || CITY_CONFIG.cityName || CITY_KEY;
  }

  function tCity(key) {
    return t(key)
      .replace(/\{city\}/g, cityLabel())
      .replace(/\{radius\}/g, String(PROPOSAL_MAX_RADIUS_KM));
  }

  function getProposalCenter() {
    return CITY_CONFIG.center || DEFAULT_CENTER;
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function isWithinProposalRadius(lat, lng) {
    const center = getProposalCenter();
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return true;
    return distanceKm(lat, lng, center.lat, center.lng) <= PROPOSAL_MAX_RADIUS_KM;
  }

  function applyLabels() {
    const set = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(key);
    };
    set("poi-propose-btn", "proposeBtn");
    set("poi-propose-title", "modalTitle");
    set("poi-propose-name-label", "nameLabel");
    set("poi-propose-lat-label", "latLabel");
    set("poi-propose-lng-label", "lngLabel");
    set("poi-propose-desc-label", "descLabel");
    set("poi-propose-email-label", "emailLabel");
    set("poi-propose-photo-label", "photoLabel");
    set("poi-propose-photo-btn", "pickPhoto");
    set("poi-propose-pick-map", "pickMap");
    set("poi-propose-my-pos", "myPos");
    set("poi-propose-submit", "submit");
    set("poi-propose-cancel", "cancel");
    set("poi-propose-hint", "hintReview");
  }

  function openModal() {
    const modal = document.getElementById("poi-propose-modal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
    applyLabels();
    const err = document.getElementById("poi-propose-error");
    const ok = document.getElementById("poi-propose-success");
    if (err) err.style.display = "none";
    if (ok) ok.style.display = "none";
    selectedPhotoFile = null;
    const photoName = document.getElementById("poi-propose-photo-name");
    if (photoName) photoName.textContent = "";
    const photoInput = document.getElementById("poi-propose-photo");
    if (photoInput) photoInput.value = "";
    disableMapPick();
  }

  function closeModal() {
    disableMapPick();
    const modal = document.getElementById("poi-propose-modal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function getMapCenter() {
    const main = window.__clqExperimentMap;
    if (main && typeof main.getCenter === "function") {
      const c = main.getCenter();
      if (c) return { lat: c.lat(), lng: c.lng() };
    }
    return { ...DEFAULT_CENTER };
  }

  function waitForGoogleMaps(maxMs) {
    return new Promise((resolve) => {
      if (window.google?.maps?.Map) {
        resolve(true);
        return;
      }
      let elapsed = 0;
      const id = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(id);
          resolve(true);
          return;
        }
        elapsed += 50;
        if (elapsed >= maxMs) {
          clearInterval(id);
          resolve(false);
        }
      }, 50);
    });
  }

  function ensureMiniMap() {
    const el = document.getElementById("poi-propose-mini-map");
    if (!el || !window.google?.maps) return null;
    if (miniMap) return miniMap;
    miniMap = new google.maps.Map(el, {
      center: getMapCenter(),
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    return miniMap;
  }

  function setMiniMapMarker(lat, lng) {
    if (!miniMap || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const pos = { lat, lng };
    if (miniMapMarker) {
      miniMapMarker.setPosition(pos);
    } else {
      miniMapMarker = new google.maps.Marker({ map: miniMap, position: pos, draggable: true });
      miniMapMarker.addListener("dragend", () => {
        const p = miniMapMarker.getPosition();
        if (!p) return;
        document.getElementById("poi-propose-lat").value = p.lat().toFixed(6);
        document.getElementById("poi-propose-lng").value = p.lng().toFixed(6);
      });
    }
    miniMap.panTo(pos);
  }

  function disableMapPick() {
    if (mapPickListener && window.google?.maps?.event) {
      google.maps.event.removeListener(mapPickListener);
      mapPickListener = null;
    }
    const hint = document.getElementById("poi-propose-pick-hint");
    if (hint) hint.style.display = "none";
    const miniEl = document.getElementById("poi-propose-mini-map");
    if (miniEl) miniEl.classList.remove("poi-propose-mini-map--active");
  }

  async function enableMapPick() {
    const hint = document.getElementById("poi-propose-pick-hint");
    const miniEl = document.getElementById("poi-propose-mini-map");
    disableMapPick();

    const ready = await waitForGoogleMaps(8000);
    if (!ready) {
      if (hint) {
        hint.textContent = t("pickMapUnavailable");
        hint.style.display = "block";
      }
      return;
    }

    if (miniEl) {
      miniEl.classList.add("poi-propose-mini-map--active");
      miniEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    const map = ensureMiniMap();
    if (!map) return;

    const latVal = parseCoord(document.getElementById("poi-propose-lat").value);
    const lngVal = parseCoord(document.getElementById("poi-propose-lng").value);
    if (Number.isFinite(latVal) && Number.isFinite(lngVal)) setMiniMapMarker(latVal, lngVal);

    if (hint) {
      hint.textContent = t("pickMapActive");
      hint.style.display = "block";
    }

    mapPickListener = map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      document.getElementById("poi-propose-lat").value = lat.toFixed(6);
      document.getElementById("poi-propose-lng").value = lng.toFixed(6);
      setMiniMapMarker(lat, lng);
    });
  }

  function drawBitmapToJpegDataUrl(bitmap, maxW, quality) {
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    if (typeof bitmap.close === "function") bitmap.close();
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function fileToJpegDataUrl(file, maxW, quality) {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        return drawBitmapToJpegDataUrl(bitmap, maxW, quality);
      } catch {
        /* fallback Image() */
      }
    }
    return resizeJpeg(file, maxW, quality);
  }

  function resizeJpeg(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  function messageForServerError(code, data) {
    if (code === "smtp_not_configured" || code === "delivery_failed") return t("errSmtp");
    if (code === "invalid_photo_jpeg" || code === "photo_too_large") return t("errPhotoConvert");
    if (code === "blobs_not_configured") return t("errFunctionMissing");
    if (/^coords_outside_/.test(code || "")) return tCity("errCoordsOutOfArea");
    if (data?.detail && typeof data.detail === "string") return data.detail;
    return t("errGeneric");
  }

  function proposeEndpoint() {
    if (window.CLQ_POI_PROPOSE_URL) return window.CLQ_POI_PROPOSE_URL;
    return "/.netlify/functions/poi-propose";
  }

  function fetchWithTimeout(url, options, timeoutMs = 45000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  async function readJsonResponse(res) {
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("<")) return { parseError: true, data: {} };
    try {
      return { parseError: false, data: JSON.parse(trimmed) };
    } catch {
      return { parseError: true, data: {} };
    }
  }

  function parseCoord(raw) {
    const s = String(raw || "").trim().replace(/\s/g, "").replace(",", ".");
    if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function isImageFile(file) {
    if (!file) return false;
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp|heic)$/i.test(file.name || "");
  }

  function showError(errEl, message) {
    errEl.textContent = message;
    errEl.style.display = "block";
    errEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function getSelectedPhotoFile() {
    return selectedPhotoFile || document.getElementById("poi-propose-photo")?.files?.[0] || null;
  }

  function onPhotoSelected(evt) {
    const file = evt.target?.files?.[0] || null;
    selectedPhotoFile = file;
    const nameEl = document.getElementById("poi-propose-photo-name");
    if (nameEl) nameEl.textContent = file ? file.name : "";
  }

  function pickPhotoFile() {
    document.getElementById("poi-propose-photo")?.click();
  }

  async function submitForm(evt) {
    if (evt) evt.preventDefault();
    const errEl = document.getElementById("poi-propose-error");
    const okEl = document.getElementById("poi-propose-success");
    const btn = document.getElementById("poi-propose-submit");
    errEl.style.display = "none";
    okEl.style.display = "none";

    const name = document.getElementById("poi-propose-name").value.trim();
    const lat = parseCoord(document.getElementById("poi-propose-lat").value);
    const lng = parseCoord(document.getElementById("poi-propose-lng").value);
    const description = document.getElementById("poi-propose-desc").value.trim();
    const submitterEmail = document.getElementById("poi-propose-email").value.trim();
    const file = getSelectedPhotoFile();

    if (!name) return showError(errEl, t("errRequired"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return showError(errEl, t("errCoordsInvalid"));
    if (!isWithinProposalRadius(lat, lng)) return showError(errEl, tCity("errCoordsOutOfArea"));
    if (description.length < 10) return showError(errEl, t("errDescShort"));
    if (!isImageFile(file)) return showError(errEl, t("errPhotoRequired"));

    btn.disabled = true;
    const prevLabel = btn.textContent;
    btn.textContent = t("sending");

    try {
      const photoBase64 = await fileToJpegDataUrl(file, 1200, 0.85);
      const res = await fetchWithTimeout(proposeEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lat, lng, cityKey: CITY_KEY, description, submitterEmail, sourceLang: lang(), photoBase64 }),
      });
      const { parseError, data } = await readJsonResponse(res);
      if (res.status === 404) return showError(errEl, t("errFunctionMissing"));
      if (parseError) {
        return showError(
          errEl,
          res.status >= 500 ? t("errFunctionMissing") : `${t("errBadResponse")} (HTTP ${res.status})`,
        );
      }
      if (!res.ok) return showError(errEl, messageForServerError(data.error, data));
      okEl.textContent = t("success");
      okEl.style.display = "block";
      document.getElementById("poi-propose-form").reset();
      selectedPhotoFile = null;
      const photoName = document.getElementById("poi-propose-photo-name");
      if (photoName) photoName.textContent = "";
      miniMapMarker = null;
      setTimeout(closeModal, 3500);
    } catch (err) {
      showError(errEl, err?.name === "AbortError" ? t("errTimeout") : (err?.message === "image" ? t("errPhotoConvert") : t("errGeneric")));
    } finally {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  }

  function useMyPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        document.getElementById("poi-propose-lat").value = lat.toFixed(6);
        document.getElementById("poi-propose-lng").value = lng.toFixed(6);
        if (miniMap) setMiniMapMarker(lat, lng);
      },
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  function normalizeCoordInput(evt) {
    const n = parseCoord(evt.target?.value);
    if (Number.isFinite(n)) evt.target.value = n.toFixed(6);
  }

  function init() {
    document.getElementById("poi-propose-btn")?.addEventListener("click", openModal);
    document.getElementById("poi-propose-cancel")?.addEventListener("click", closeModal);
    document.querySelector("#poi-propose-modal .poi-propose-backdrop")?.addEventListener("click", closeModal);
    document.getElementById("poi-propose-pick-map")?.addEventListener("click", enableMapPick);
    document.getElementById("poi-propose-my-pos")?.addEventListener("click", useMyPosition);
    document.getElementById("poi-propose-photo-btn")?.addEventListener("click", pickPhotoFile);
    document.getElementById("poi-propose-photo")?.addEventListener("change", onPhotoSelected);
    document.getElementById("poi-propose-form")?.addEventListener("submit", submitForm);
    document.getElementById("poi-propose-submit")?.addEventListener("click", submitForm);
    document.getElementById("poi-propose-lat")?.addEventListener("blur", normalizeCoordInput);
    document.getElementById("poi-propose-lng")?.addEventListener("blur", normalizeCoordInput);
    document.addEventListener("languageChanged", applyLabels);
    applyLabels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
