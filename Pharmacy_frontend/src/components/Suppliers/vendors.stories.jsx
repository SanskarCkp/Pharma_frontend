import React from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import {vendors} from './vendors';

const meta: Meta<typeof vendors> = {
  component: vendors,
};

export default meta;

type Story = StoryObj<typeof vendors>;

export const Basic: Story = {args: {}};
