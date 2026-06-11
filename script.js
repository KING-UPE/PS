(function () {
    'use strict';

    gsap.registerPlugin(ScrollTrigger);

    // ==========================================
    // DOM
    // ==========================================
    const sections = Array.from(document.querySelectorAll('.lec'));
    const navDots = Array.from(document.querySelectorAll('.nav-dot'));
    const navFill = document.getElementById('navFill');
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');

    let hue = 260;
    const lecHues = [260, 260, 235, 210, 190, 0, 150, 35, 200, 290, 340, 25, 280];

    // ==========================================
    // CANVAS: Living aurora
    // ==========================================
    let cW, cH, orbs = [], time = 0;

    function resizeCanvas() {
        cW = canvas.width = innerWidth;
        cH = canvas.height = innerHeight;
        orbs = [];
        for (let i = 0; i < 5; i++) {
            orbs.push({
                x: Math.random() * cW, y: Math.random() * cH,
                vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                r: Math.max(cW, cH) * (0.22 + Math.random() * 0.18),
                ho: i * 25,
            });
        }
    }
    resizeCanvas();
    addEventListener('resize', () => { resizeCanvas(); ScrollTrigger.refresh(); });

    function drawCanvas() {
        time += 0.003;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, cW, cH);
        for (const o of orbs) {
            o.x += o.vx + Math.sin(time + o.ho) * 0.25;
            o.y += o.vy + Math.cos(time + o.ho * 0.7) * 0.25;
            if (o.x < -o.r) o.x = cW + o.r;
            if (o.x > cW + o.r) o.x = -o.r;
            if (o.y < -o.r) o.y = cH + o.r;
            if (o.y > cH + o.r) o.y = -o.r;
            const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
            const h = (hue + o.ho) % 360;
            g.addColorStop(0, `hsla(${h},70%,38%,0.18)`);
            g.addColorStop(0.5, `hsla(${h},60%,22%,0.07)`);
            g.addColorStop(1, `hsla(${h},50%,15%,0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, cW, cH);
        }
        requestAnimationFrame(drawCanvas);
    }
    drawCanvas();

    // ==========================================
    // SPLIT TITLES INTO WORDS
    // ==========================================
    document.querySelectorAll('[data-split]').forEach(el => {
        const txt = el.textContent.trim();
        el.innerHTML = '';
        txt.split(/\s+/).forEach(w => {
            const wrap = document.createElement('span');
            wrap.className = 'word-wrap';
            const inner = document.createElement('span');
            inner.className = 'word-inner';
            inner.textContent = w;
            wrap.appendChild(inner);
            el.appendChild(wrap);
        });
    });

    // ==========================================
    // PROGRESSIVE SIDEBAR (bit by bit)
    // ==========================================
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
            const progress = Math.min(scrollTop / docHeight, 1);
            navFill.style.height = (progress * 100) + '%';
        }
        // Continuous hue shift with scroll
        hue = ((260 + scrollTop * 0.03) % 360 + 360) % 360;
    }, { passive: true });

    // ==========================================
    // ACTIVE DOT TRACKING
    // ==========================================
    let currentDotIdx = 0;

    function setActiveDot(sectionIdx) {
        if (sectionIdx === currentDotIdx) return;
        currentDotIdx = sectionIdx;
        navDots.forEach((d, i) => d.classList.toggle('active', i === sectionIdx));
    }

    // ==========================================
    // BUILD SCROLL TIMELINES
    // ==========================================
    const sectionTriggers = [];

    sections.forEach((section, secIdx) => {
        const heroNum = section.querySelector('.lec-num');
        const words = section.querySelectorAll('.word-inner');
        const heroMeta = section.querySelector('.lec-meta');
        const coverInfo = section.querySelector('.cover-info');
        const heroCue = section.querySelector('.lec-cue');
        const blocks = Array.from(section.querySelectorAll('.lec-block'));
        const numBlocks = blocks.length;

        // Calculate scroll distance
        const scrollDist = 1800 + numBlocks * 1000 + 400;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                pin: true,
                start: 'top top',
                end: '+=' + scrollDist,
                scrub: 1,
                onUpdate: () => { setActiveDot(secIdx); },
            }
        });

        sectionTriggers.push(tl.scrollTrigger);

        // ---- HERO PHASE ----

        // Number appears
        tl.fromTo(heroNum,
            { opacity: 0, scale: 0.5 },
            { opacity: 0.15, scale: 1, duration: 2, ease: 'power3.out' }
        );

        // Title words cascade
        if (words.length) {
            tl.to(words, {
                y: 0, duration: 3, stagger: 0.4, ease: 'power4.out'
            }, 0.5);
        }

        // Lecturer meta OR cover info
        const metaEl = heroMeta || coverInfo;
        if (metaEl) {
            tl.fromTo(metaEl,
                { opacity: 0, y: 25 },
                { opacity: 1, y: 0, duration: 2, ease: 'power3.out' },
                words.length > 0 ? 0.5 + Math.min(words.length, 6) * 0.4 : 2
            );
        }

        // Cue
        if (heroCue) {
            tl.fromTo(heroCue,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 1.5 },
                '<1'
            );
        }

        // Pause
        tl.to({}, { duration: 3 });

        // ---- HERO EXIT ----
        if (heroCue) tl.to(heroCue, { opacity: 0, y: -20, duration: 1 });
        if (metaEl) tl.to(metaEl, { opacity: 0, y: -20, duration: 1 }, '<0.2');
        if (words.length) tl.to(words, { y: '-120%', duration: 1.5, stagger: 0.1, ease: 'power2.in' }, '<0.2');
        tl.to(heroNum, { opacity: 0, scale: 1.3, duration: 1.5 }, '<0.2');

        // Gap
        tl.to({}, { duration: 1 });

        // ---- DETAIL BLOCKS ----
        blocks.forEach((block, blockIdx) => {
            const title = block.querySelector('.block-title');
            const body = block.querySelector('.block-body');

            // Block visible
            tl.fromTo(block, { opacity: 0 }, { opacity: 1, duration: 0.5 });

            // Title dramatic entrance
            tl.fromTo(title,
                { opacity: 0, y: 40, scale: 0.9 },
                { opacity: 1, y: 0, scale: 1, duration: 2.5, ease: 'power3.out' },
                '<'
            );

            // Body blur-in
            tl.fromTo(body,
                { opacity: 0, y: 30, filter: 'blur(8px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 2.5, ease: 'power3.out' },
                '>-1'
            );

            // Pause to read
            tl.to({}, { duration: 4 });

            // Exit
            tl.to(body, { opacity: 0, y: -20, duration: 1.5 });
            tl.to(title, { opacity: 0, y: -30, scale: 0.95, duration: 1.5 }, '<0.1');
            tl.to(block, { opacity: 0, duration: 0.5 }, '>-0.5');

            if (blockIdx < numBlocks - 1) {
                tl.to({}, { duration: 0.5 });
            }
        });

        // Final buffer
        tl.to({}, { duration: 1 });
    });

    // ==========================================
    // NAV DOT CLICKS -> scroll to section
    // ==========================================
    navDots.forEach((dot, dotIdx) => {
        dot.addEventListener('click', () => {
            const st = sectionTriggers[dotIdx];
            if (st) {
                window.scrollTo({ top: st.start, behavior: 'smooth' });
            }
        });
    });

    // ==========================================
    // INIT
    // ==========================================
    setActiveDot(0);

})();