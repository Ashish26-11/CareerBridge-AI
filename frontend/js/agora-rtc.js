/**
 * Agora WebRTC Wrapper for CareerBridge-AI
 */

class AgoraClient {
    constructor() {
        this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        this.localTracks = {
            videoTrack: null,
            audioTrack: null
        };
        this.remoteUsers = {};
        this.options = {
            appId: null,
            channel: null,
            uid: null,
            token: null
        };
    }

    async init(appId, channel, token, uid) {
        this.options.appId = appId;
        this.options.channel = channel;
        this.options.token = token;
        this.options.uid = uid;

        // Add event listeners
        this.client.on("user-published", (user, mediaType) => this.handleUserPublished(user, mediaType));
        this.client.on("user-unpublished", (user) => this.handleUserUnpublished(user));
    }

    async join() {
        // Join the channel
        this.options.uid = await this.client.join(
            this.options.appId,
            this.options.channel,
            this.options.token,
            this.options.uid
        );

        // Create local tracks
        [this.localTracks.audioTrack, this.localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

        // Play local video
        this.localTracks.videoTrack.play("local-player");

        // Publish local tracks
        await this.client.publish(Object.values(this.localTracks));
        console.log("Publish success");
    }

    async leave() {
        for (let trackName in this.localTracks) {
            var track = this.localTracks[trackName];
            if (track) {
                track.stop();
                track.close();
                this.localTracks[trackName] = null;
            }
        }

        this.remoteUsers = {};
        await this.client.leave();
        console.log("Client left channel success");
    }

    async handleUserPublished(user, mediaType) {
        const id = user.uid;
        this.remoteUsers[id] = user;
        await this.client.subscribe(user, mediaType);
        console.log("Subscribe success");

        if (mediaType === "video") {
            const remotePlayerContainer = document.getElementById("remote-playerlist");
            // If container doesn't exist, use remoteVideo from session.html
            const player = document.getElementById("remoteVideo") || remotePlayerContainer;
            user.videoTrack.play(player);
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    }

    handleUserUnpublished(user) {
        const id = user.uid;
        delete this.remoteUsers[id];
    }

    async toggleAudio(enabled) {
        if (this.localTracks.audioTrack) {
            await this.localTracks.audioTrack.setEnabled(enabled);
        }
    }

    async toggleVideo(enabled) {
        if (this.localTracks.videoTrack) {
            await this.localTracks.videoTrack.setEnabled(enabled);
        }
    }

    async startScreenShare() {
        const screenTrack = await AgoraRTC.createScreenVideoTrack();
        await this.client.unpublish(this.localTracks.videoTrack);
        await this.client.publish(screenTrack);
        screenTrack.play("local-player");

        screenTrack.on("track-ended", async () => {
            await this.client.unpublish(screenTrack);
            screenTrack.close();
            await this.client.publish(this.localTracks.videoTrack);
            this.localTracks.videoTrack.play("local-player");
        });
    }
}

window.agoraClient = new AgoraClient();
