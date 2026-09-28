import { fireEvent, render, screen } from '@testing-library/react';
import BackupCodesPanel from './BackupCodesPanel';

const CODES = ['AAAA1111BBBB', 'CCCC2222DDDD'];

describe('BackupCodesPanel', () => {
  it('lists every code', () => {
    render(
      <BackupCodesPanel codes={CODES} email="a@b.co" onDone={jest.fn()} />,
    );

    expect(
      screen.getByRole('list', { name: 'Backup codes' }).querySelectorAll('li'),
    ).toHaveLength(2);
  });

  it("can't be closed until the user says the codes are saved", () => {
    const onDone = jest.fn();
    render(<BackupCodesPanel codes={CODES} email="a@b.co" onDone={onDone} />);
    const done = screen.getByRole('button', { name: 'Done' });

    expect(done).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText(/saved these codes/));
    fireEvent.click(done);

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
