import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useSession } from "next-auth/react";
import "react-big-calendar/lib/css/react-big-calendar.css";

import ApiCalendar from "react-google-calendar-api";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";

import { cn } from "@/lib/utils";
import WidgetProps from "@/types/widget";
import { Button } from "../ui/Button";

moment.locale("en-GB");
const config: any = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  apiKey: process.env.GOOGLE_CLIENT_SECRET,
  scope: "https://www.googleapis.com/auth/calendar",
  discoveryDocs: [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  ],
};
const googleapi = new ApiCalendar(config);
const localizer = momentLocalizer(moment);
let eventList: any;

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

const CalendarWidget: React.FC<WidgetProps> = ({ props, className }) => {
  useEffect(() => {
    //googleapi.handleAuthClick();
    if (googleapi.sign) {
      googleapi.listUpcomingEvents(30).then((res: any) => {
        console.log(res.items);
        const formattedEvents = formatEvents(res.items);
        console.log(formattedEvents);
        eventList = formattedEvents;
      });
    } else {
      console.log("FAIL:", ApiCalendar);
    }
  }, []);

  return (
    <div className={cn(className, "flex items-center justify-evenly gap-4")}>
      CalendarWidget - {googleapi.calendar}
      <Calendar
        localizer={localizer}
        events={eventList}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 400 }}
      />
    </div>
  );
};

export default CalendarWidget;
