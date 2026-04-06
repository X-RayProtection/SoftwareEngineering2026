document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const taskCountElement = document.getElementById('task-count');

    // API Base URL
    const API_URL = '/api/todos';

    // State management
    let todos = [];

    // Initialize: Fetch from server
    fetchTodos();

    // Event Listeners
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        
        if (text !== '') {
            addTodo(text);
            todoInput.value = '';
            todoInput.focus();
        }
    });

    // Functions
    async function fetchTodos() {
        try {
            const response = await fetch(API_URL);
            todos = await response.json();
            renderTodos();
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    }

    async function addTodo(text) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const newTodo = await response.json();
            todos.unshift(newTodo);
            renderTodos();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    }

    async function toggleTodo(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT'
            });
            const updatedTodo = await response.json();
            
            todos = todos.map(todo => {
                if (todo._id === id) return updatedTodo;
                return todo;
            });
            renderTodos();
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    }

    async function deleteTodo(id) {
        // Find element to add fade-out animation before actual deletion
        const itemElement = document.querySelector(`[data-id="${id}"]`);
        if (itemElement) {
            itemElement.classList.add('fade-out');
            
            // Wait for animation to finish then send API request
            setTimeout(async () => {
                try {
                    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                    todos = todos.filter(todo => todo._id !== id);
                    renderTodos();
                } catch (error) {
                    console.error('Error deleting todo:', error);
                }
            }, 300);
        } else {
             try {
                await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                todos = todos.filter(todo => todo._id !== id);
                renderTodos();
            } catch (error) {
                console.error('Error deleting todo:', error);
            }
        }
    }

    function updateTaskCount() {
        const remaining = todos.filter(t => !t.completed).length;
        const total = todos.length;
        
        if (total === 0) {
            taskCountElement.textContent = "No tasks yet";
        } else {
            taskCountElement.textContent = `${remaining} remaining out of ${total}`;
        }
    }

    function renderTodos() {
        // Clear list
        todoList.innerHTML = '';
        
        updateTaskCount();

        if (todos.length === 0) {
            todoList.innerHTML = `
                <div class="empty-state">
                    <i class="ri-checkbox-multiple-blank-line"></i>
                    <p>You're all caught up!</p>
                </div>
            `;
            return;
        }

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            // Use _id from MongoDB
            const todoId = todo._id;
            li.setAttribute('data-id', todoId);
            
            li.innerHTML = `
                <label class="checkbox-wrapper">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="todo-text">${parseMarkdown(todo.text)}</span>
                <button class="delete-btn" aria-label="Delete">
                    <i class="ri-delete-bin-7-line"></i>
                </button>
            `;

            // Toggle Event
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTodo(todoId));

            // Delete Event
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTodo(todoId));

            todoList.appendChild(li);
        });
    }

    // Helper to prevent XSS
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Helper to parse basic markdown (bold, italic, strikethrough)
    function parseMarkdown(text) {
        let parsed = escapeHTML(text);
        
        // Bold: **text**
        parsed = parsed.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_
        parsed = parsed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
        parsed = parsed.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Strikethrough: ~~text~~
        parsed = parsed.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        
        return parsed;
    }
});
