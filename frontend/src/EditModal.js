// EditModal.js
import React from 'react';

function EditModal({ visible, initialText, onCancel, onSave }) {
  // local state for the text area
  const [textValue, setTextValue] = React.useState(initialText || '');

  React.useEffect(() => {
    setTextValue(initialText || '');
  }, [initialText, visible]);

  if (!visible) return null; // don't render if not visible

  const handleSave = () => {
    onSave(textValue);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div style={{ background: '#fff', padding: 20, width: 400 }}>
        <h3>Edit Block</h3>
        <textarea
          rows={8}
          cols={40}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave} style={{ marginLeft: 10 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
