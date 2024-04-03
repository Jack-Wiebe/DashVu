import React from "react";
import WidgetProps from "@/types/widget";
import { cn } from "@/lib/utils";

const Widget: React.FC<WidgetProps> = ({ props }) => {
  const size = props.size;

  return (
    <props.Type
      props={props}
      className={cn(
        size,
        "container p-4 rounded-md outline-dotted justify-center h-96"
      )}
    >
      <props.Icon className="h-8 w-8 sm:h-6 sm:w-6"></props.Icon>
    </props.Type>
  );
};

export default Widget;
