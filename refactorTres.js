const fs = require('fs');
const moment = require('moment');

class CalendarDataProvider {
    constructor(calendar) {
        this.calendar = calendar;
    }

    getData() {
        const rawdata = fs.readFileSync(`./calendars/calendar.${this.calendar}.json`);
        return JSON.parse(rawdata);
    }
}

class SessionManager {
    constructor(data) {
        this.data = data;
    }

    hasConflicts(date, slot) {
        const sessionSlots = this.data.sessions[date] || [];
        const sessionStart = moment(date + ' ' + slot.start).valueOf();
        const sessionEnd = moment(date + ' ' + slot.end).valueOf();

        return sessionSlots.some(sessionSlot => {
            const start = moment(date + ' ' + sessionSlot.start).valueOf();
            const end = moment(date + ' ' + sessionSlot.end).valueOf();
            return sessionStart < end && sessionEnd > start;
        });
    }
}

class SlotCalculator {
    constructor(data) {
        this.data = data;
    }

    calculateSlots(date, daySlots, durationBefore, durationAfter, duration) {
        const dateISO = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
        const availableSlots = [];

        daySlots.forEach(slot => {
            if (!this.sessionManager.hasConflicts(dateISO, slot)) {
                const calculatedSlots = this.getOneMiniSlot(slot.start, slot.end, durationBefore, durationAfter, duration, dateISO);
                availableSlots.push(...calculatedSlots);
            }
        });

        return availableSlots;
    }

    getOneMiniSlot(startSlot, endSlot, durationBefore, durationAfter, duration, dateISO) {
        const startHourFirst = moment(dateISO + ' ' + startSlot);
        const startHour = startHourFirst.format('HH:mm');
        const endHour = this.addMinutes(startHourFirst, durationBefore + duration + durationAfter);
        const clientStartHour = this.addMinutes(startHourFirst, durationBefore);
        const clientEndHour = this.addMinutes(startHourFirst, duration);

        if (moment.utc(endHour, 'HH:mm').valueOf() > moment.utc(endSlot, 'HH:mm').valueOf()) {
            return [];
        }

        const objSlot = {
            startHour: moment.utc(dateISO + ' ' + startHour).toDate(),
            endHour: moment.utc(dateISO + ' ' + endHour).toDate(),
            clientStartHour: moment.utc(dateISO + ' ' + clientStartHour).toDate(),
            clientEndHour: moment.utc(dateISO + ' ' + clientEndHour).toDate(),
        };

        return [objSlot];
    }

    addMinutes(hour, minutes) {
        const result = moment(hour).add(minutes, 'minutes').format('HH:mm');
        return result;
    }
}

class AvailableSpotsService {
    constructor(calendar, dataProvider, sessionManager, slotCalculator) {
        this.calendar = calendar;
        this.dataProvider = dataProvider;
        this.sessionManager = sessionManager;
        this.slotCalculator = slotCalculator;
    }

    getAvailableSpots(date, duration) {
        const data = this.dataProvider.getData();
        const daySlots = data.slots[date] || [];

        return this.slotCalculator.calculateSlots(date, daySlots, data.durationBefore, data.durationAfter, duration);
    }
}

const calendarDataProvider = new CalendarDataProvider('1');
const data = calendarDataProvider.getData();
const sessionManager = new SessionManager(data);
const slotCalculator = new SlotCalculator(data);
const getAvailableSpots = new AvailableSpotsService('1', calendarDataProvider, sessionManager, slotCalculator);

module.exports = { getAvailableSpots };
