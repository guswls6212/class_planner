import type { Meta, StoryObj } from '@storybook/react-vite';
import Card from '../components/molecules/Card';
import Typography from '../components/atoms/Typography';
import Button from '../components/atoms/Button';

const meta: Meta<typeof Card> = {
  title: 'Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'outlined'],
    },
    padding: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '기본 카드',
    children: (
      <Typography variant="body">
        이것은 기본 카드입니다. 기본적인 정보를 표시할 때 사용합니다.
      </Typography>
    ),
  },
};

export const Elevated: Story = {
  args: {
    title: '그림자가 있는 카드',
    variant: 'elevated',
    children: (
      <Typography variant="body">
        그림자가 있는 카드입니다. 더 강조하고 싶은 내용에 사용합니다.
      </Typography>
    ),
  },
};

export const Outlined: Story = {
  args: {
    title: '테두리만 있는 카드',
    variant: 'outlined',
    children: (
      <Typography variant="body">
        테두리만 있는 카드입니다. 배경이 투명하여 다른 요소와 조화롭게 사용할 수
        있습니다.
      </Typography>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    title: '작은 패딩 카드',
    padding: 'small',
    children: (
      <Typography variant="body">
        작은 패딩을 가진 카드입니다. 공간을 절약하고 싶을 때 사용합니다.
      </Typography>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    title: '큰 패딩 카드',
    padding: 'large',
    children: (
      <Typography variant="body">
        큰 패딩을 가진 카드입니다. 여유로운 공간을 원할 때 사용합니다.
      </Typography>
    ),
  },
};

export const WithButtons: Story = {
  args: {
    title: '버튼이 있는 카드',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography variant="body">
          여러 버튼이 포함된 카드입니다. 사용자 액션을 유도할 때 사용합니다.
        </Typography>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" size="small">
            저장
          </Button>
          <Button variant="secondary" size="small">
            취소
          </Button>
        </div>
      </div>
    ),
  },
};

export const Clickable: Story = {
  args: {
    title: '클릭 가능한 카드',
    variant: 'elevated',
    children: (
      <Typography variant="body">
        클릭할 수 있는 카드입니다. 호버 시 그림자가 커지고 위로 올라갑니다.
      </Typography>
    ),
    onClick: () => alert('카드가 클릭되었습니다!'),
  },
};

export const ComplexContent: Story = {
  args: {
    title: '복잡한 내용 카드',
    variant: 'elevated',
    padding: 'large',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Typography variant="h4" color="primary">
          중요한 정보
        </Typography>
        <Typography variant="body">
          이 카드는 여러 요소를 포함하고 있습니다. 제목, 본문, 버튼 등 다양한
          컴포넌트를 조합하여 사용할 수 있습니다.
        </Typography>
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="caption" color="secondary">
            💡 팁: 카드 내부에 다른 스타일링된 요소들을 배치할 수 있습니다.
          </Typography>
        </div>
        <div
          style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}
        >
          <Button variant="secondary" size="small">
            더 보기
          </Button>
          <Button variant="primary" size="small">
            확인
          </Button>
        </div>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        maxWidth: '800px',
      }}
    >
      <Card title="기본" variant="default" padding="medium">
        <Typography variant="body">기본 카드</Typography>
      </Card>
      <Card title="그림자" variant="elevated" padding="medium">
        <Typography variant="body">그림자 카드</Typography>
      </Card>
      <Card title="테두리" variant="outlined" padding="medium">
        <Typography variant="body">테두리 카드</Typography>
      </Card>
    </div>
  ),
};
