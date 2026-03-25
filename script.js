document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const display = document.getElementById('password-display');
    const copyBtn = document.getElementById('copy-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const generateBtn = document.getElementById('generate-btn');
    const lengthSlider = document.getElementById('length-slider');
    const lengthVal = document.getElementById('length-val');
    const strengthBar = document.getElementById('strength-bar');
    const strengthLabel = document.getElementById('strength-label');
    const toast = document.getElementById('toast');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const themeToggle = document.getElementById('theme-toggle');

    // --- Options ---
    const options = {
        uppercase: document.getElementById('uppercase'),
        lowercase: document.getElementById('lowercase'),
        numbers: document.getElementById('numbers'),
        symbols: document.getElementById('symbols'),
        excludeSimilar: document.getElementById('exclude-similar'),
        noRepeat: document.getElementById('no-repeat')
    };

    // --- Character Sets ---
    const charSets = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-='
    };

    const similarChars = 'il1Lo0O';

    // --- State ---
    let passwordHistory = [];
    let isGenerating = false;

    // --- Audio Context for Sound Effects ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'generate') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'copy') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        }
    }

    // --- Core Functions ---

    function getRandomChar(str) {
        return str[Math.floor(Math.random() * str.length)];
    }

    function calculateStrength(password) {
        let score = 0;
        if (password.length > 8) score += 1;
        if (password.length > 12) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        const barWidth = (score / 5) * 100;
        strengthBar.style.width = `${barWidth}%`;

        if (score <= 2) {
            strengthBar.style.background = 'var(--danger-color)';
            strengthLabel.innerText = 'Weak';
            strengthLabel.style.color = 'var(--danger-color)';
        } else if (score <= 3) {
            strengthBar.style.background = 'var(--warning-color)';
            strengthLabel.innerText = 'Medium';
            strengthLabel.style.color = 'var(--warning-color)';
        } else {
            strengthBar.style.background = 'var(--success-color)';
            strengthLabel.innerText = 'Strong';
            strengthLabel.style.color = 'var(--success-color)';
        }
    }

    function generatePassword() {
        if (isGenerating) return;
        isGenerating = true;

        // Validation
        const activeOptions = Object.values(options).filter(opt => opt.checked && !opt.id.includes('exclude') && !opt.id.includes('repeat'));
        if (activeOptions.length === 0) {
            display.innerText = "Select at least one option!";
            isGenerating = false;
            return;
        }

        let validChars = '';
        let password = '';

        // Build Character Pool
        if (options.uppercase.checked) validChars += charSets.uppercase;
        if (options.lowercase.checked) validChars += charSets.lowercase;
        if (options.numbers.checked) validChars += charSets.numbers;
        if (options.symbols.checked) validChars += charSets.symbols;

        // Exclude Similar
        if (options.excludeSimilar.checked) {
            validChars = validChars.split('').filter(c => !similarChars.includes(c)).join('');
        }

        // Ensure at least one of each selected type
        activeOptions.forEach(opt => {
            const type = opt.id;
            let set = charSets[type];
            if (options.excludeSimilar.checked) {
                set = set.split('').filter(c => !similarChars.includes(c)).join('');
            }
            password += getRandomChar(set);
        });

        // Fill remaining length
        const length = parseInt(lengthSlider.value);
        for (let i = password.length; i < length; i++) {
            const char = getRandomChar(validChars);
            
            if (options.noRepeat.checked && password.includes(char)) {
                // If repeat not allowed, try finding a non-repeat char
                // If pool exhausted, just allow repeat to avoid infinite loop
                const remaining = validChars.split('').filter(c => !password.includes(c));
                if (remaining.length > 0) {
                    password += getRandomChar(remaining);
                } else {
                    password += char; 
                }
            } else {
                password += char;
            }
        }

        // Shuffle password to avoid predictable patterns (e.g., Upper always first)
        password = password.split('').sort(() => 0.5 - Math.random()).join('');

        // Update UI
        typeWriterEffect(password);
        calculateStrength(password);
        addToHistory(password);
        playSound('generate');
        
        setTimeout(() => { isGenerating = false; }, 500);
    }

    function typeWriterEffect(text) {
        display.innerText = '';
        let i = 0;
        const speed = 30; 
        
        function type() {
            if (i < text.length) {
                display.innerText += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    function addToHistory(pwd) {
        // Prevent duplicates at top of list
        if (passwordHistory[0] === pwd) return;
        
        passwordHistory.unshift(pwd);
        if (passwordHistory.length > 5) passwordHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        passwordHistory.forEach(pwd => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${pwd.substring(0, 12)}${pwd.length > 12 ? '...' : ''}</span>
                <i class="fa-regular fa-copy"></i>
            `;
            li.addEventListener('click', () => copyToClipboard(pwd));
            historyList.appendChild(li);
        });
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast();
            playSound('copy');
        });
    }

    function showToast() {
        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 2000);
    }

    function speakPassword() {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(display.innerText);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Voice feature not supported in this browser.");
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // --- Event Listeners ---

    generateBtn.addEventListener('click', generatePassword);
    
    copyBtn.addEventListener('click', () => {
        if(display.innerText !== 'Generating...' && display.innerText !== "Select at least one option!") {
            copyToClipboard(display.innerText);
        }
    });

    voiceBtn.addEventListener('click', speakPassword);

    lengthSlider.addEventListener('input', (e) => {
        lengthVal.innerText = e.target.value;
        // Auto generate on slide release could be added, but let's keep it manual or debounce
    });
    
    // Auto-generate on settings change (debounced slightly for performance)
    let timeout;
    Object.values(options).forEach(opt => {
        opt.addEventListener('change', () => {
            clearTimeout(timeout);
            timeout = setTimeout(generatePassword, 300);
        });
    });

    clearHistoryBtn.addEventListener('click', () => {
        passwordHistory = [];
        renderHistory();
    });

    themeToggle.addEventListener('click', toggleTheme);

    // Initial Generation
    generatePassword();
});
