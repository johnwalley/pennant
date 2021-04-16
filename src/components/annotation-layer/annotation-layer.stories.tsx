import * as AnnotationStories from "../label/label.stories";

import { AnnotationLayer, AnnotationLayerProps } from "./annotation-layer";
import { Meta, Story } from "@storybook/react";

import { LabelProps } from "../label";

export default {
  title: "Components/AnnotationLayer",
  component: AnnotationLayer,
  argTypes: {
    //👇 Creates specific argTypes with options
    position: {
      control: { type: "range", min: 0, max: 600, step: 5 },
    },
  },
} as Meta;

const Template: Story<
  AnnotationLayerProps & { id: string; position: number }
> = (args) => {
  args.annotations[2].y = args.position;

  return (
    <div style={{ backgroundColor: "black", width: "600px", height: "500px" }}>
      <AnnotationLayer {...args} />
    </div>
  );
};

export const Example = Template.bind({});
Example.args = {
  annotations: [
    {
      ...(AnnotationStories.LimitGt.args as LabelProps),
      type: "label",
      id: "a",
      y: 30,
    },
    {
      ...(AnnotationStories.Position.args as LabelProps),
      type: "label",
      id: "b",
      y: 100,
    },
    {
      ...(AnnotationStories.Limit.args as LabelProps),
      type: "label",
      id: "c",
      y: 110,
    },
  ],
  position: 110,
};
