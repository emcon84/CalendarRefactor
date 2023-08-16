const moment = require('moment');
const fs = require('fs');

function getAvailableSpots(calendar, date, duration) {
    const rawdata = fs.readFileSync(`./calendars/calendar.${calendar}.json`);
    const data = JSON.parse(rawdata);
    const daySlots = data.slots[date] || [];
    const availableSpots = realSpots(daySlots, data, date, duration);
    return availableSpots;
}

function realSpots(daySlots, data, date, duration) {
    const dateISO = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    const durationBefore = data.durationBefore;
    const durationAfter = data.durationAfter;
    const spots = [];

    daySlots.forEach(daySlot => {
        let noConflicts = true;
        if (data.sessions && data.sessions[date]) {
            data.sessions[date].forEach(sessionSlot => {
                const sessionStart = moment(dateISO + ' ' + sessionSlot.start).valueOf();
                const sessionEnd = moment(dateISO + ' ' + sessionSlot.end).valueOf();
                const start = moment(dateISO + ' ' + daySlot.start).valueOf();
                const end = moment(dateISO + ' ' + daySlot.end).valueOf();

                if (sessionStart < end && sessionEnd > start) {
                    noConflicts = false;
                }
            });
        }

        if (noConflicts) {
            spots.push(daySlot);
        }
    });

    return arrSlot(spots, durationBefore, durationAfter, duration, dateISO);
}


function getMomentHour(hour, dateISO) {
    let finalHourForAdd = moment(dateISO + ' ' + hour);
    return finalHourForAdd;
}
function addMinutes(hour, minutes) {
    let result = moment(hour).add(minutes, 'minutes').format('HH:mm');
    return result;
}

function getOneMiniSlot(startSlot, endSlot, durationBefore, durationAfter, duration, dateISO) {
    const startHourFirst = getMomentHour(startSlot, dateISO);
    const startHour = startHourFirst.format('HH:mm');
    const endHour = addMinutes(startHourFirst, durationBefore + duration + durationAfter);
    const clientStartHour = addMinutes(startHourFirst, durationBefore);
    const clientEndHour = addMinutes(startHourFirst, duration);

    if (moment.utc(endHour, 'HH:mm').valueOf() > moment.utc(endSlot, 'HH:mm').valueOf()) {
        return null;
    }

    const objSlot = {
        startHour: moment.utc(dateISO + ' ' + startHour).toDate(),
        endHour: moment.utc(dateISO + ' ' + endHour).toDate(),
        clientStartHour: moment.utc(dateISO + ' ' + clientStartHour).toDate(),
        clientEndHour: moment.utc(dateISO + ' ' + clientEndHour).toDate(),
    };

    return objSlot;
}

function arrSlot(spots, durationBefore, durationAfter, duration, dateISO) {
    const slotArr = [];

    spots.forEach(slot => {
        const resultSlot = getOneMiniSlot(
            slot.start, slot.end, durationBefore, durationAfter, duration, dateISO
        );

        if (resultSlot) {
            slotArr.push(resultSlot);
        }
    });

    return slotArr;
}

module.exports = { getAvailableSpots };