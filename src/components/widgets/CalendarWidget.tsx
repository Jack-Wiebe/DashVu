import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useSession } from "next-auth/react";

import { gapi } from "gapi-script";

import ApiCalendar from "react-google-calendar-api";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";

import { cn } from "@/lib/utils";
import WidgetProps from "@/types/widget";
import { Button } from "../ui/Button";
//import { calendar } from "@googleapis/calendar";

moment.locale("en-GB");
const localizer = momentLocalizer(moment);
//const eventList;

const formatEvents = (events: any[]) => {
  let output: any = [];
  events.forEach((e, index) => {
    let sYear = null;
    let sMonth = null;
    let sDay = null;
    let eYear = null;
    let eMonth = null;
    let eDay = null;
    if (e.start.dateTime) {
      sYear = parseInt(e.start.dateTime.split("-")[0]);
      sMonth = parseInt(e.start.dateTime.split("-")[1]);
      sDay = parseInt(e.start.dateTime.split("-")[2]);
      eYear = parseInt(e.end.dateTime.split("-")[0]);
      eMonth = parseInt(e.end.dateTime.split("-")[1]);
      eDay = parseInt(e.end.dateTime.split("-")[2]);
    } else if (e.start.date) {
      sYear = parseInt(e.start.date.split("-")[0]);
      sMonth = parseInt(e.start.date.split("-")[1]);
      sDay = parseInt(e.start.date.split("-")[2]);
      eYear = parseInt(e.end.date.split("-")[0]);
      eMonth = parseInt(e.end.date.split("-")[1]);
      eDay = parseInt(e.end.date.split("-")[2]);
    } else {
      return;
    }

    let formattedEvent = {
      id: index,
      title: e.summary,
      allDay: true,
      start: new Date(sYear, sMonth - 1, sDay),
      end: new Date(eYear, eMonth - 1, eDay),
    };
    output.push(formattedEvent);
  });
  return output;
};

// const getEvents = (calendarID, apiKey) => {
//   function initiate() {
//     gapi.client
//       .init({
//         apiKey: apiKey,
//       })

//       .then(function () {
//         return gapi.client.request({
//           path: `https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events`,
//         });
//       })

//       .then(
//         (response) => {
//           let events = response.result.items;
//           return events;
//         },
//         function (err) {
//           return [false, err];
//         }
//       );
//   }

//   gapi.load("client", initiate);
// };

const CalendarWidget: React.FC<WidgetProps> = ({ props, className }) => {
  return (
    <div className={cn(className, "flex items-center justify-evenly gap-4")}>
      CalendarWidget - {useSession()?.data?.user.name}
      {/* <Calendar
        localizer={localizer}
        events={eventList}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 400 }}
      /> */}
    </div>
  );
};

export default CalendarWidget;
