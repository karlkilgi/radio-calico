class RadioPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playBtn = document.getElementById('playBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.status = document.getElementById('status');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.artistName = document.getElementById('artistName');
        this.songTitle = document.getElementById('songTitle');
        this.albumInfo = document.getElementById('albumInfo');
        this.sourceQuality = document.getElementById('sourceQuality');
        this.streamQuality = document.getElementById('streamQuality');
        this.albumArt = document.getElementById('albumArt');
        this.trackList = document.getElementById('trackList');
        this.trackLoading = document.getElementById('trackLoading');
        this.trackContent = document.getElementById('trackContent');

        this.streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
        this.metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
        this.isPlaying = false;
        this.hls = null;
        this.startTime = null;
        this.elapsedTimer = null;
        this.metadataTimer = null;

        this.init();
        this.initializeUserId();
    }

    init() {
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        this.audio.addEventListener('loadstart', () => this.updateStatus('Loading stream...', 'loading'));
        this.audio.addEventListener('canplay', () => this.updateStatus('Ready to play', ''));
        this.audio.addEventListener('playing', () => this.updateStatus('Playing live stream', 'playing'));
        this.audio.addEventListener('pause', () => this.updateStatus('Paused', ''));
        this.audio.addEventListener('error', () => this.updateStatus('Connection error', 'error'));
        this.audio.addEventListener('waiting', () => this.updateStatus('Buffering...', 'loading'));

        // Set initial volume
        this.audio.volume = 0.8;

        this.setupHLS();
        this.startMetadataFetching();
    }

    setupHLS() {
        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            this.hls.loadSource(this.streamUrl);
            this.hls.attachMedia(this.audio);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed, ready to play');
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    this.updateStatus('Stream error - retrying...', 'error');
                    setTimeout(() => this.retryConnection(), 3000);
                }
            });
        } else if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            this.audio.src = this.streamUrl;
        } else {
            this.updateStatus('HLS not supported in this browser', 'error');
        }
    }

    async togglePlay() {
        try {
            if (this.isPlaying) {
                this.audio.pause();
                this.playBtn.innerHTML = '▶';
                this.isPlaying = false;
                this.stopTimer();
            } else {
                await this.audio.play();
                this.playBtn.innerHTML = '⏸';
                this.isPlaying = true;
                this.startTimer();
            }
        } catch (error) {
            console.error('Playback error:', error);
            this.updateStatus('Playback failed - check connection', 'error');
        }
    }

    setVolume(value) {
        this.audio.volume = value / 100;
    }

    updateStatus(message, className) {
        this.status.textContent = message;
        this.status.className = `status ${className}`;
    }

    retryConnection() {
        if (this.hls) {
            this.hls.destroy();
            this.setupHLS();
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.elapsedTimer = setInterval(() => {
            this.updateElapsedTime();
        }, 1000);
    }

    stopTimer() {
        if (this.elapsedTimer) {
            clearInterval(this.elapsedTimer);
            this.elapsedTimer = null;
        }
        this.timeDisplay.textContent = '00:00:00';
    }

    updateElapsedTime() {
        if (this.startTime && this.isPlaying) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;

            this.timeDisplay.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    async fetchMetadata() {
        try {
            const response = await fetch(this.metadataUrl);
            if (response.ok) {
                const data = await response.json();
                this.updateNowPlaying(data);
                this.updateRecentlyPlayed(data);
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    }

    startMetadataFetching() {
        this.fetchMetadata(); // Initial fetch
        this.metadataTimer = setInterval(() => {
            this.fetchMetadata();
        }, 15000); // Update every 15 seconds
    }

    updateNowPlaying(data) {
        this.currentTrack = data;

        // Hide loading state and show content
        this.trackLoading.style.display = 'none';
        this.trackContent.style.display = 'block';

        // Update track information
        this.artistName.textContent = data.artist || 'Unknown Artist';
        this.songTitle.textContent = `${data.title || 'Unknown Title'}${data.date ? ` (${data.date})` : ''}`;
        this.albumInfo.textContent = data.album || 'Unknown Album';

        // Update quality information
        this.sourceQuality.textContent = `Source quality: ${data.bit_depth || '16'}-bit ${(data.sample_rate || '44100') / 1000}kHz`;
        this.streamQuality.textContent = 'Stream quality: 48kHz FLAC / HLS Lossless';

        // Set up rating button listeners and load ratings after user ID is ready
        setTimeout(() => {
            this.setupRatingButtons();
            this.loadRatings();
        }, 500); // Give time for user ID to initialize
    }

    updateRecentlyPlayed(data) {
        const tracks = [];

        // Extract previous tracks from numbered fields
        for (let i = 1; i <= 5; i++) {
            const artist = data[`prev_artist_${i}`];
            const title = data[`prev_title_${i}`];

            if (artist && title) {
                tracks.push({ artist, title });
            }
        }

        if (tracks.length === 0) {
            this.trackList.innerHTML = '<li class="loading">No recent tracks available</li>';
            return;
        }

        const tracksList = tracks.map(track => `
            <li><span class="artist">${track.artist}:</span> <span class="song">${track.title}</span></li>
        `).join('');

        this.trackList.innerHTML = tracksList;
    }

    async initializeUserId() {
        this.userId = await this.getUserId();
    }

    async getClientIP() {
        try {
            const response = await fetch('/api/client-ip');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    async generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('RadioCalico fingerprint', 2, 2);
        const canvasFingerprint = canvas.toDataURL();

        const clientIP = await this.getClientIP();

        const fingerprint = {
            ip: clientIP,
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100),
            canvas: canvasFingerprint.substring(0, 50),
            memory: navigator.deviceMemory || 'unknown',
            cores: navigator.hardwareConcurrency || 'unknown',
            touchSupport: 'ontouchstart' in window,
            webgl: this.getWebGLFingerprint(),
            fonts: this.getFontFingerprint()
        };

        const fingerprintString = JSON.stringify(fingerprint);
        return this.hashString(fingerprintString);
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'no-webgl';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return debugInfo ?
                gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).substring(0, 30) :
                'webgl-available';
        } catch (e) {
            return 'webgl-error';
        }
    }

    getFontFingerprint() {
        const testFonts = ['Arial', 'Times', 'Courier', 'Helvetica', 'Georgia', 'Verdana'];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let fontHash = '';

        testFonts.forEach(font => {
            ctx.font = `12px ${font}`;
            ctx.fillText('mmmmmmmmlli', 0, 0);
            fontHash += canvas.toDataURL().substring(0, 10);
        });

        return this.hashString(fontHash).substring(0, 8);
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async getUserId() {
        const fingerprint = await this.generateFingerprint();

        // Try to get existing fingerprint-based ID
        let userId = localStorage.getItem('radioCalico_userId');
        const storedFingerprint = localStorage.getItem('radioCalico_fingerprint');

        if (!userId || !storedFingerprint || storedFingerprint !== fingerprint) {
            // Generate new user ID based on fingerprint
            userId = `fp_${fingerprint}_${Date.now().toString(36)}`;
            localStorage.setItem('radioCalico_userId', userId);
            localStorage.setItem('radioCalico_fingerprint', fingerprint);

            // Also use sessionStorage as backup
            sessionStorage.setItem('radioCalico_userId_backup', userId);
        } else if (!userId && sessionStorage.getItem('radioCalico_userId_backup')) {
            // Fallback to session storage if localStorage is cleared
            userId = sessionStorage.getItem('radioCalico_userId_backup');
            localStorage.setItem('radioCalico_userId', userId);
        }

        return userId;
    }

    getSongHash(track) {
        const hashString = `${track.artist || ''}_${track.title || ''}_${track.album || ''}`.toLowerCase();
        return this.hashString(hashString);
    }

    setupRatingButtons() {
        const thumbsUpBtn = document.getElementById('thumbsUpBtn');
        const thumbsDownBtn = document.getElementById('thumbsDownBtn');

        if (thumbsUpBtn && thumbsDownBtn) {
            thumbsUpBtn.addEventListener('click', () => this.rateSong(1));
            thumbsDownBtn.addEventListener('click', () => this.rateSong(-1));
        }
    }

    async loadRatings() {
        if (!this.currentTrack || !this.userId) return;

        try {
            const songHash = this.getSongHash(this.currentTrack);

            // Load total ratings
            const ratingsResponse = await fetch(`/api/song/${songHash}/ratings`);
            if (ratingsResponse.ok) {
                const ratings = await ratingsResponse.json();
                document.getElementById('thumbsUpCount').textContent = ratings.thumbs_up;
                document.getElementById('thumbsDownCount').textContent = ratings.thumbs_down;
            }

            // Load user's rating
            const userRatingResponse = await fetch(`/api/song/${songHash}/user-rating/${this.userId}`);
            if (userRatingResponse.ok) {
                const userRating = await userRatingResponse.json();
                this.updateRatingButtons(userRating.rating);
            }
        } catch (error) {
            console.error('Error loading ratings:', error);
        }
    }

    updateRatingButtons(userRating) {
        const thumbsUpBtn = document.getElementById('thumbsUpBtn');
        const thumbsDownBtn = document.getElementById('thumbsDownBtn');

        if (!thumbsUpBtn || !thumbsDownBtn) return;

        // Reset button states
        thumbsUpBtn.classList.remove('active');
        thumbsDownBtn.classList.remove('active');

        // Set active state based on user rating
        if (userRating === 1) {
            thumbsUpBtn.classList.add('active');
        } else if (userRating === -1) {
            thumbsDownBtn.classList.add('active');
        }
    }

    async rateSong(rating) {
        if (!this.currentTrack || !this.userId) return;

        try {
            const songHash = this.getSongHash(this.currentTrack);
            const response = await fetch(`/api/song/${songHash}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: rating,
                    userId: this.userId,
                    title: this.currentTrack.title,
                    artist: this.currentTrack.artist,
                    album: this.currentTrack.album
                })
            });

            if (response.ok) {
                const result = await response.json();
                document.getElementById('thumbsUpCount').textContent = result.thumbs_up;
                document.getElementById('thumbsDownCount').textContent = result.thumbs_down;
                this.updateRatingButtons(rating);
            } else {
                console.error('Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    new RadioPlayer();
});