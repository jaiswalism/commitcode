import { db } from '../storage/db';

document.addEventListener('DOMContentLoaded', async () => {
  // Setup Options button
  const optionsBtn = document.getElementById('open-options');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Setup Queue List
  const queueList = document.getElementById('queue-list');
  if (!queueList) return;

  const renderQueue = async () => {
    try {
      const queue = await db.getQueue();
      
      if (queue.length === 0) {
        queueList.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center;">No pending commits.</div>';
        return;
      }

      queueList.innerHTML = '';
      
      queue.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'queue-item';
        
        const infoEl = document.createElement('div');
        infoEl.className = 'queue-item-info';
        
        const titleEl = document.createElement('span');
        titleEl.textContent = `Problem ${item.problem.id} (${item.problem.language})`;
        
        const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const reasonEl = document.createElement('span');
        reasonEl.className = 'queue-item-reason';
        reasonEl.textContent = `${timeStr} | ${item.reason}`;
        
        infoEl.appendChild(titleEl);
        infoEl.appendChild(reasonEl);
        
        const actionsEl = document.createElement('div');
        actionsEl.className = 'queue-actions';

        const syncBtn = document.createElement('button');
        syncBtn.className = 'icon-btn btn-sync';
        syncBtn.innerHTML = '&#8635;'; // refresh/sync icon
        syncBtn.title = 'Commit Now';
        
        syncBtn.addEventListener('click', async () => {
          syncBtn.disabled = true;
          syncBtn.innerHTML = '...';
          // Tell background script to process queue immediately
          chrome.runtime.sendMessage({ type: 'PROCESS_QUEUE' }, async () => {
            await renderQueue();
          });
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'icon-btn btn-delete';
        cancelBtn.innerHTML = '&#128465;'; // dustbin icon
        cancelBtn.title = 'Delete';
        
        cancelBtn.addEventListener('click', async () => {
          cancelBtn.disabled = true;
          await db.removeFromQueue(item.problem.id, item.problem.language);
          await renderQueue(); // Re-render the list
        });
        
        actionsEl.appendChild(syncBtn);
        actionsEl.appendChild(cancelBtn);

        itemEl.appendChild(infoEl);
        itemEl.appendChild(actionsEl);
        queueList.appendChild(itemEl);
      });
    } catch (e) {
      queueList.innerHTML = '<div style="font-size: 13px; color: #d32f2f; text-align: center;">Failed to load queue.</div>';
    }
  };

  await renderQueue();
});
