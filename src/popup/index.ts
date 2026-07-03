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
  const queueCount = document.getElementById('queue-count');
  if (!queueList) return;

  const renderQueue = async () => {
    try {
      const queue = await db.getQueue();
      
      if (queueCount) queueCount.textContent = queue.length.toString();
      
      if (queue.length === 0) {
        queueList.innerHTML = '<div class="text-xs text-zinc-500 text-center py-4 font-mono italic">No pending commits</div>';
        return;
      }

      queueList.innerHTML = '';
      
      queue.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'flex justify-between items-center bg-zinc-950/50 border border-zinc-800/80 rounded p-2.5 hover:border-zinc-700 transition-colors group';
        
        const infoEl = document.createElement('div');
        infoEl.className = 'flex flex-col min-w-0 flex-1 mr-2';
        
        const titleEl = document.createElement('span');
        titleEl.className = 'text-[11px] text-zinc-200 font-medium truncate tracking-wide';
        titleEl.textContent = `Problem ${item.problem.id} (${item.problem.language})`;
        
        const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const reasonEl = document.createElement('span');
        reasonEl.className = 'text-[10px] text-zinc-500 truncate mt-0.5';
        reasonEl.textContent = `${timeStr} • ${item.reason}`;
        
        infoEl.appendChild(titleEl);
        infoEl.appendChild(reasonEl);
        
        const actionsEl = document.createElement('div');
        actionsEl.className = 'flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity';

        const syncBtn = document.createElement('button');
        syncBtn.className = 'bg-transparent border-none text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded cursor-pointer transition-colors focus:outline-none';
        syncBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg>';
        syncBtn.title = 'Commit Now';
        
        syncBtn.addEventListener('click', async () => {
          syncBtn.disabled = true;
          syncBtn.classList.add('opacity-50');
          // Tell background script to process queue immediately
          chrome.runtime.sendMessage({ type: 'PROCESS_QUEUE' }, async () => {
            await renderQueue();
          });
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'bg-transparent border-none text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded cursor-pointer transition-colors focus:outline-none';
        cancelBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>';
        cancelBtn.title = 'Delete';
        
        cancelBtn.addEventListener('click', async () => {
          cancelBtn.disabled = true;
          cancelBtn.classList.add('opacity-50');
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
      if (queueCount) queueCount.textContent = '!';
      queueList.innerHTML = '<div class="text-xs text-red-400 text-center py-4 font-mono">Failed to load queue.</div>';
    }
  };

  await renderQueue();
});
