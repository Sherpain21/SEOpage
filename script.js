const PROXY = "https://api.allorigins.win/get?url=";

const analyzeBtn = document.getElementById("analyzeBtn");
const urlInput = document.getElementById("urlInput");
const loading = document.getElementById("loading");
const result = document.getElementById("result");

analyzeBtn.addEventListener("click", run);
urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run();
});

async function run() {
    const raw = urlInput.value.trim();
    if (!raw) return;

    let url = raw;
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }

    setLoading(true);

    try {
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        const html = json.contents;

        if (!html) throw new Error("HTML을 가져올 수 없습니다.");

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        analyze(doc, url);
    } catch (e) {
        setLoading(false);
        alert("분석에 실패했습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.\n" + e.message);
    }
}

function setLoading(bool) {
    if (bool) {
        loading.classList.remove("hidden");
        result.classList.add("hidden");
        analyzeBtn.disabled = true;
    } else {
        loading.classList.add("hidden");
        analyzeBtn.disabled = false;
    }
}

function analyze(doc, url) {
    const checks = [];

    // ── 타이틀 태그 ─────────────────────────────
    const title = doc.querySelector("title");
    const titleText = title ? title.textContent.trim() : "";
    (() => {
        let status, badge, message, code;
        if (!titleText) {
            status = "bad"; badge = "오류";
            message = "타이틀 태그가 없습니다. 검색엔진은 타이틀을 페이지 제목으로 사용합니다.";
            code = `<title>페이지 제목을 입력하세요</title>`;
        } else if (titleText.length < 10 || titleText.length > 60) {
            status = "warn"; badge = "주의";
            message = `타이틀 길이가 ${titleText.length}자입니다. 권장 범위는 10~60자입니다.`;
            code = `<title>${titleText}</title>`;
        } else {
            status = "good"; badge = "양호";
            message = `타이틀이 적절하게 작성되어 있습니다. (${titleText.length}자)`;
            code = `<title>${titleText}</title>`;
        }
        checks.push({
            category: "seo",
            name: "타이틀 태그",
            status, badge, message, code,
            guide: "타이틀 태그는 검색 결과 페이지에서 클릭률을 결정하는 핵심 요소입니다. 10~60자, 핵심 키워드 포함을 권장합니다.",
            score: status === "good" ? 8 : status === "warn" ? 4 : 0,
            maxScore: 8
        });
    })();

    // ── 메타 Description ────────────────────────
    const desc = doc.querySelector('meta[name="description"]');
    const descText = desc ? (desc.getAttribute("content") || "").trim() : "";
    (() => {
        let status, badge, message, code;
        if (!desc || !descText) {
            status = "bad"; badge = "오류";
            message = "메타 Description이 없습니다.";
            code = `<meta name="description" content="페이지 설명을 입력하세요">`;
        } else if (descText.length < 50 || descText.length > 160) {
            status = "warn"; badge = "주의";
            message = `Description 길이가 ${descText.length}자입니다. 한글 80~110자, 영문 135~160자를 권장합니다.`;
            code = `<meta name="description" content="${descText}">`;
        } else {
            status = "good"; badge = "양호";
            message = `Description이 적절하게 작성되어 있습니다. (${descText.length}자)`;
            code = `<meta name="description" content="${descText}">`;
        }
        checks.push({
            category: "seo",
            name: "메타태그 - Description",
            status, badge, message, code,
            guide: "Description은 검색 결과에서 미리보기 텍스트로 표시됩니다. 핵심 내용을 담아 한글 80~110자로 작성하세요.",
            score: status === "good" ? 8 : status === "warn" ? 4 : 0,
            maxScore: 8
        });
    })();

    // ── 메타 Keywords ───────────────────────────
    const kw = doc.querySelector('meta[name="keywords"]');
    const kwText = kw ? (kw.getAttribute("content") || "").trim() : "";
    (() => {
        let status, badge, message, code;
        if (!kw || !kwText) {
            status = "warn"; badge = "주의";
            message = "메타 Keywords가 없습니다. 필수는 아니지만 일부 검색엔진에서 활용됩니다.";
            code = `<meta name="keywords" content="키워드1, 키워드2, 키워드3">`;
        } else {
            const kwCount = kwText.split(",").length;
            if (kwCount > 10) {
                status = "warn"; badge = "주의";
                message = `키워드가 ${kwCount}개입니다. 10개 이내로 줄이는 것을 권장합니다.`;
            } else {
                status = "good"; badge = "양호";
                message = `Keywords가 적절하게 설정되어 있습니다. (${kwCount}개)`;
            }
            code = `<meta name="keywords" content="${kwText}">`;
        }
        checks.push({
            category: "content",
            name: "메타태그 - Keywords",
            status, badge, message, code,
            guide: "메타 Keywords는 10개 이내로 핵심 키워드를 설정하세요. 현재 Google은 직접 반영하지 않지만 네이버 등에서 활용합니다.",
            score: status === "good" ? 5 : status === "warn" ? 2 : 0,
            maxScore: 5
        });
    })();

    // ── 캐노니컬 태그 ────────────────────────────
    const canonical = doc.querySelector('link[rel="canonical"]');
    const canonicalHref = canonical ? (canonical.getAttribute("href") || "").trim() : "";
    (() => {
        let status, badge, message, code;
        if (!canonical || !canonicalHref) {
            status = "warn"; badge = "주의";
            message = "캐노니컬 태그가 없습니다. 중복 콘텐츠 문제 방지를 위해 권장됩니다.";
            code = `<link rel="canonical" href="${url}">`;
        } else {
            status = "good"; badge = "양호";
            message = "캐노니컬 태그가 설정되어 있습니다.";
            code = `<link rel="canonical" href="${canonicalHref}">`;
        }
        checks.push({
            category: "seo",
            name: "캐노니컬 태그 - Canonical",
            status, badge, message, code,
            guide: "캐노니컬 태그는 동일 콘텐츠가 여러 URL에 존재할 때 대표 URL을 지정합니다. 중복 콘텐츠 페널티를 방지합니다.",
            score: status === "good" ? 6 : 0,
            maxScore: 6
        });
    })();

    // ── OG 태그 ─────────────────────────────────
    const ogType = doc.querySelector('meta[property="og:type"]');
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const ogUrl = doc.querySelector('meta[property="og:url"]');
    const ogImage = doc.querySelector('meta[property="og:image"]');
    (() => {
        const missing = [];
        if (!ogType) missing.push("og:type");
        if (!ogTitle) missing.push("og:title");
        if (!ogDesc) missing.push("og:description");
        if (!ogUrl) missing.push("og:url");
        if (!ogImage) missing.push("og:image");

        let status, badge, message;
        if (missing.length === 0) {
            status = "good"; badge = "양호";
            message = "Open Graph 태그가 모두 설정되어 있습니다.";
        } else if (missing.length <= 2) {
            status = "warn"; badge = "주의";
            message = `OG 태그 중 ${missing.join(", ")}가 누락되어 있습니다.`;
        } else {
            status = "bad"; badge = "오류";
            message = `OG 태그가 대부분 누락되어 있습니다. (누락: ${missing.join(", ")})`;
        }

        const code = [
            `<meta property="og:type" content="${ogType ? ogType.getAttribute("content") : "website"}">`,
            `<meta property="og:title" content="${ogTitle ? ogTitle.getAttribute("content") : ""}">`,
            `<meta property="og:description" content="${ogDesc ? ogDesc.getAttribute("content") : ""}">`,
            `<meta property="og:url" content="${ogUrl ? ogUrl.getAttribute("content") : url}">`,
            `<meta property="og:image" content="${ogImage ? ogImage.getAttribute("content") : ""}">`
        ].join("\n");

        checks.push({
            category: "social",
            name: "오픈그래프 - OG 태그",
            status, badge, message, code,
            guide: "Open Graph 태그는 SNS 공유 시 미리보기 콘텐츠를 제어합니다. og:type, og:title, og:description, og:url, og:image 5개를 모두 설정하세요.",
            score: status === "good" ? 10 : status === "warn" ? 5 : 0,
            maxScore: 10
        });
    })();

    // ── 이미지 Alt ───────────────────────────────
    const imgs = doc.querySelectorAll("img");
    (() => {
        const total = imgs.length;
        let noAlt = 0;
        imgs.forEach(img => {
            if (!img.getAttribute("alt") && img.getAttribute("alt") !== "") noAlt++;
        });

        let status, badge, message, code;
        if (total === 0) {
            status = "warn"; badge = "주의";
            message = "페이지에 이미지가 없거나 감지되지 않습니다.";
            code = `<img src="이미지경로" alt="이미지 설명">`;
        } else if (noAlt === 0) {
            status = "good"; badge = "양호";
            message = `총 ${total}개 이미지 모두 alt 속성이 있습니다.`;
            code = `<!-- 총 ${total}개 이미지 모두 alt 속성 정상 -->`;
        } else {
            status = noAlt > total / 2 ? "bad" : "warn";
            badge = status === "bad" ? "오류" : "주의";
            message = `${total}개 이미지 중 ${noAlt}개에 alt 속성이 없습니다.`;
            code = `<!-- alt 없는 이미지 예시 -->\n<img src="이미지경로">\n\n<!-- 수정 후 -->\n<img src="이미지경로" alt="이미지 설명">`;
        }

        checks.push({
            category: "seo",
            name: "이미지 태그 - Alt 속성",
            status, badge, message, code,
            guide: "이미지 alt 속성은 검색엔진이 이미지 내용을 이해하는 데 필요합니다. 모든 이미지에 구체적인 설명을 작성하세요.",
            score: status === "good" ? 6 : status === "warn" ? 3 : 0,
            maxScore: 6
        });
    })();

    // ── H1 태그 ──────────────────────────────────
    const h1s = doc.querySelectorAll("h1");
    (() => {
        let status, badge, message, code;
        if (h1s.length === 0) {
            status = "bad"; badge = "오류";
            message = "H1 태그가 없습니다.";
            code = `<h1>페이지 핵심 제목</h1>`;
        } else if (h1s.length > 1) {
            status = "warn"; badge = "주의";
            message = `H1 태그가 ${h1s.length}개입니다. 페이지당 1개만 권장됩니다.`;
            code = Array.from(h1s).map(h => `<h1>${h.textContent.trim()}</h1>`).join("\n");
        } else {
            status = "good"; badge = "양호";
            message = `H1 태그가 올바르게 1개 사용되었습니다.`;
            code = `<h1>${h1s[0].textContent.trim()}</h1>`;
        }
        checks.push({
            category: "content",
            name: "제목 태그 - H1",
            status, badge, message, code,
            guide: "H1 태그는 페이지의 가장 중요한 제목입니다. 페이지당 반드시 1개만 사용하고, 핵심 키워드를 포함하세요.",
            score: status === "good" ? 8 : status === "warn" ? 4 : 0,
            maxScore: 8
        });
    })();

    // ── H2 태그 ──────────────────────────────────
    const h2s = doc.querySelectorAll("h2");
    (() => {
        let status, badge, message, code;
        if (h2s.length === 0) {
            status = "warn"; badge = "주의";
            message = "H2 태그가 없습니다. 콘텐츠 구조화를 위해 사용을 권장합니다.";
            code = `<h2>소제목</h2>`;
        } else {
            status = "good"; badge = "양호";
            message = `H2 태그가 ${h2s.length}개 사용되었습니다.`;
            code = Array.from(h2s).slice(0, 3).map(h => `<h2>${h.textContent.trim()}</h2>`).join("\n");
        }
        checks.push({
            category: "content",
            name: "제목 태그 - H2",
            status, badge, message, code,
            guide: "H2 태그는 본문을 논리적으로 구분하는 소제목입니다. 콘텐츠 섹션마다 적절히 활용하세요.",
            score: status === "good" ? 5 : 2,
            maxScore: 5
        });
    })();

    // ── 파비콘 ───────────────────────────────────
    const favicon = doc.querySelector('link[rel="shortcut icon"], link[rel="icon"]');
    (() => {
        let status, badge, message, code;
        if (!favicon) {
            status = "warn"; badge = "주의";
            message = "파비콘이 감지되지 않았습니다.";
            code = `<link rel="shortcut icon" href="/favicon.ico">`;
        } else {
            status = "good"; badge = "양호";
            message = "파비콘이 설정되어 있습니다.";
            code = `<link rel="shortcut icon" href="${favicon.getAttribute("href")}">`;
        }
        checks.push({
            category: "etc",
            name: "파비콘 - Favicon",
            status, badge, message, code,
            guide: "파비콘은 브라우저 탭과 북마크에 표시되는 아이콘입니다. 브랜드 인지도를 높이고 사용자 경험을 개선합니다.",
            score: status === "good" ? 3 : 0,
            maxScore: 3
        });
    })();

    // ── Viewport ─────────────────────────────────
    const viewport = doc.querySelector('meta[name="viewport"]');
    (() => {
        let status, badge, message, code;
        if (!viewport) {
            status = "bad"; badge = "오류";
            message = "Viewport 메타태그가 없습니다. 모바일 최적화가 되지 않습니다.";
            code = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
        } else {
            status = "good"; badge = "양호";
            message = "Viewport 메타태그가 설정되어 있습니다.";
            code = `<meta name="viewport" content="${viewport.getAttribute("content")}">`;
        }
        checks.push({
            category: "seo",
            name: "뷰포트 - Viewport",
            status, badge, message, code,
            guide: "Viewport 설정은 모바일 최적화의 기본입니다. Google은 모바일 친화적인 사이트를 검색 순위에서 우대합니다.",
            score: status === "good" ? 6 : 0,
            maxScore: 6
        });
    })();

    // ── SSL ──────────────────────────────────────
    (() => {
        const isHttps = url.startsWith("https://");
        checks.push({
            category: "perf",
            name: "보안 인증 - SSL",
            status: isHttps ? "good" : "bad",
            badge: isHttps ? "양호" : "오류",
            message: isHttps
                ? "HTTPS가 적용되어 있습니다."
                : "HTTPS가 적용되어 있지 않습니다. SSL 인증서 설치를 권장합니다.",
            code: isHttps
                ? `<!-- 현재 URL: ${url} -->`
                : `<!-- HTTP를 HTTPS로 리다이렉트 설정 필요 -->`,
            guide: "SSL(HTTPS)은 Google 검색 순위 반영 요소입니다. 사용자 데이터 보호와 신뢰도 향상을 위해 필수입니다.",
            score: isHttps ? 10 : 0,
            maxScore: 10
        });
    })();

    // ── 구조화 데이터 LD+JSON ────────────────────
    const ldJson = doc.querySelector('script[type="application/ld+json"]');
    (() => {
        let status, badge, message, code;
        if (!ldJson) {
            status = "warn"; badge = "주의";
            message = "구조화 데이터(LD+JSON)가 없습니다. 리치 스니펫 노출 기회를 놓칠 수 있습니다.";
            code = `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "사이트명",\n  "url": "${url}"\n}\n<\/script>`;
        } else {
            status = "good"; badge = "양호";
            message = "구조화 데이터(LD+JSON)가 감지되었습니다.";
            code = ldJson.textContent.trim().substring(0, 200) + "...";
        }
        checks.push({
            category: "etc",
            name: "구조화 데이터 - LD+JSON",
            status, badge, message, code,
            guide: "구조화 데이터는 검색 결과에서 별점, FAQ 등 리치 스니펫을 표시하게 해줍니다. Schema.org 형식을 사용하세요.",
            score: status === "good" ? 2 : 0,
            maxScore: 2
        });
    })();

    // ── 페이지 글자 수 ───────────────────────────
    (() => {
        const bodyText = doc.body ? doc.body.innerText || doc.body.textContent || "" : "";
        const len = bodyText.replace(/\s+/g, "").length;
        let status, badge, message;
        if (len < 300) {
            status = "bad"; badge = "오류";
            message = `페이지 텍스트가 ${len}자로 너무 적습니다. 300자 이상의 콘텐츠를 권장합니다.`;
        } else if (len < 600) {
            status = "warn"; badge = "주의";
            message = `페이지 텍스트가 ${len}자입니다. 더 풍부한 콘텐츠 작성을 권장합니다.`;
        } else {
            status = "good"; badge = "양호";
            message = `페이지 텍스트가 ${len}자로 충분합니다.`;
        }
        checks.push({
            category: "content",
            name: "페이지 총 글자 수",
            status, badge, message,
            code: `<!-- 현재 페이지 텍스트: 약 ${len}자 -->`,
            guide: "풍부한 텍스트 콘텐츠는 검색엔진이 페이지의 주제를 파악하는 데 도움이 됩니다. 최소 300자 이상 작성하세요.",
            score: status === "good" ? 7 : status === "warn" ? 3 : 0,
            maxScore: 7
        });
    })();

    // ── 점수 계산 ────────────────────────────────
    const catMap = {
        seo: { max: 40, score: 0 },
        content: { max: 25, score: 0 },
        social: { max: 10, score: 0 },
        perf: { max: 20, score: 0 },
        etc: { max: 5, score: 0 }
    };

    checks.forEach(c => {
        if (catMap[c.category]) {
            catMap[c.category].score += c.score;
        }
    });

    // 카테고리별 비율로 최종 점수 계산
    let total = 0;
    Object.keys(catMap).forEach(k => {
        const cat = catMap[k];
        total += Math.min(cat.score, cat.max);
    });

    setLoading(false);
    renderResult(total, checks, catMap, url);
}

function renderResult(total, checks, catMap, url) {
    result.classList.remove("hidden");

    // 총점
    document.getElementById("totalScore").textContent = total;
    document.getElementById("siteDomain").textContent = url;

    // 원형 그래프
    const progress = document.getElementById("scoreProgress");
    const circumference = 314;
    const offset = circumference - (total / 100) * circumference;
    setTimeout(() => {
        progress.style.strokeDashoffset = offset;
        if (total >= 80) progress.style.stroke = "#16a34a";
        else if (total >= 50) progress.style.stroke = "#d97706";
        else progress.style.stroke = "#dc2626";
    }, 100);

    // 등급 & 코멘트
    let grade, comment;
    if (total >= 80) {
        grade = "우수";
        comment = "SEO 관리가 잘 되어 있습니다. 지속적인 모니터링과 콘텐츠 업데이트로 검색 순위를 유지하세요.";
    } else if (total >= 60) {
        grade = "양호";
        comment = "전반적으로 관리가 되고 있지만, 일부 항목의 개선이 필요합니다. 주의 항목을 우선적으로 수정해보세요.";
    } else if (total >= 40) {
        grade = "보통";
        comment = "관리가 되고 있지만, 세부적인 테크니컬 SEO에 대한 정확한 진단이 필요합니다. 오류 항목부터 수정하세요.";
    } else {
        grade = "미흡";
        comment = "SEO 기본 요소가 많이 누락되어 있습니다. 오류 항목을 우선 수정하고 전문가 컨설팅을 고려해보세요.";
    }

    document.getElementById("scoreGrade").textContent = grade;
    document.getElementById("scoreComment").textContent = comment;

    // 카테고리 점수
    const catIds = {
        seo: { label: "SEO 구조", max: 40 },
        content: { label: "콘텐츠 & 키워드", max: 25 },
        social: { label: "소셜 친화도", max: 10 },
        perf: { label: "성능 / 보안", max: 20 },
        etc: { label: "기타(기술)", max: 5 }
    };

    const catDomMap = {
        seo: { score: "catSeo", bar: "catSeoBar" },
        content: { score: "catContent", bar: "catContentBar" },
        social: { score: "catSocial", bar: "catSocialBar" },
        perf: { score: "catPerf", bar: "catPerfBar" },
        etc: { score: "catEtc", bar: "catEtcBar" }
    };

    Object.keys(catDomMap).forEach(k => {
        const s = Math.min(catMap[k].score, catIds[k].max);
        const m = catIds[k].max;
        document.getElementById(catDomMap[k].score).textContent = `${s}/${m}`;
        setTimeout(() => {
            document.getElementById(catDomMap[k].bar).style.width = `${(s / m) * 100}%`;
        }, 200);
    });

    // 상세 리스트
    const list = document.getElementById("detailList");
    list.innerHTML = "";

    checks.forEach((c, i) => {
        const item = document.createElement("div");
        item.className = "detail-item";

        item.innerHTML = `
            <div class="detail-header" data-index="${i}">
                <span class="detail-status ${c.status}"></span>
                <span class="detail-name">${c.name}</span>
                <span class="detail-badge ${c.status}">${c.badge}</span>
                <span class="detail-toggle" data-index="${i}">▼</span>
            </div>
            <div class="detail-body" id="body-${i}">
                <p class="detail-message">${c.message}</p>
                ${c.code ? `<div class="detail-code"><code>${escapeHtml(c.code)}</code></div>` : ""}
                <p class="detail-guide">${c.guide}</p>
            </div>
        `;

        list.appendChild(item);

        item.querySelector(".detail-header").addEventListener("click", () => {
            const body = document.getElementById(`body-${i}`);
            const toggle = item.querySelector(".detail-toggle");
            body.classList.toggle("open");
            toggle.classList.toggle("open");
        });
    });

    window.scrollTo({ top: result.offsetTop - 24, behavior: "smooth" });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
