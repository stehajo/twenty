import { useContext } from 'react';
import { Key } from 'ts-key-enum';

import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { useRecordBoardCardNavigation } from '@/object-record/record-board/hooks/useRecordBoardCardNavigation';
import { useRecordBoardSelectAllHotkeys } from '@/object-record/record-board/hooks/useRecordBoardSelectAllHotkeys';
import { RecordIndexHotkeyScope } from '@/object-record/record-index/types/RecordIndexHotkeyScope';
import { PageFocusId } from '@/types/PageFocusId';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';

export const RecordBoardHotkeyEffect = () => {
  const { recordBoardId } = useContext(RecordBoardContext);

  const { move } = useRecordBoardCardNavigation(recordBoardId);

  useHotkeysOnFocusedElement({
    keys: [Key.ArrowLeft, Key.ArrowUp, Key.ArrowDown, Key.ArrowRight],
    callback: () => {
      move('down');
    },
    focusId: PageFocusId.RecordIndex,
    scope: RecordIndexHotkeyScope.RecordIndex,
    dependencies: [move],
  });

  useRecordBoardSelectAllHotkeys({
    recordBoardId,
    focusId: recordBoardId,
  });

  return null;
};
