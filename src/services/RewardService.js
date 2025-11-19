import crypto from 'node:crypto';

export default class RewardService {
  constructor(db) {
    this.db = db;
  }

  getRewardMessage() {
    const data = this.db.read();
    return data.rewardMessage || '';
  }

  setRewardMessage(message) {
    const data = this.db.read();
    data.rewardMessage = message;
    this.db.write(data);
    return data.rewardMessage;
  }

  createRequest(payload) {
    const data = this.db.read();
    const request = {
      id: crypto.randomUUID(),
      userId: payload.userId,
      username: payload.username || '',
      name: payload.name || '',
      mediaType: payload.mediaType,
      fileId: payload.fileId,
      caption: payload.caption || '',
      createdAt: new Date().toISOString(),
      handled: false
    };
    data.rewardRequests.push(request);
    this.db.write(data);
    return request;
  }

  getRequestById(id) {
    const data = this.db.read();
    return data.rewardRequests.find((item) => item.id === id);
  }

  markHandled(id) {
    const data = this.db.read();
    const request = data.rewardRequests.find((item) => item.id === id);
    if (!request) return null;
    request.handled = true;
    this.db.write(data);
    return request;
  }
}
