export class DateUtils {
    static isNewDay(date) {
        return new Date().toDateString() !== date.toDateString();
    }

    static getNextResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }
}