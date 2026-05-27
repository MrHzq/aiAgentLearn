<script setup>
import { ref, onMounted, computed } from 'vue'

// Todo 数据结构
const todos = ref([])
const newTodo = ref('')
const editingId = ref(null)
const editedText = ref('')
const filter = ref('all') // 'all', 'active', 'completed'

// 从 localStorage 加载数据
onMounted(() => {
  const savedTodos = localStorage.getItem('todos')
  if (savedTodos) {
    try {
      todos.value = JSON.parse(savedTodos)
    } catch (e) {
      console.error('Failed to parse todos from localStorage', e)
      todos.value = []
    }
  }
})

// 保存到 localStorage
const saveTodos = () => {
  localStorage.setItem('todos', JSON.stringify(todos.value))
}

// 添加新 todo
const addTodo = () => {
  if (newTodo.value.trim() === '') return
  
  const todo = {
    id: Date.now(),
    text: newTodo.value.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  }
  
  todos.value.unshift(todo)
  newTodo.value = ''
  saveTodos()
}

// 删除 todo
const deleteTodo = (id) => {
  todos.value = todos.value.filter(todo => todo.id !== id)
  saveTodos()
}

// 切换完成状态
const toggleTodo = (id) => {
  const todo = todos.value.find(todo => todo.id === id)
  if (todo) {
    todo.completed = !todo.completed
    saveTodos()
  }
}

// 开始编辑
const startEditing = (todo) => {
  editingId.value = todo.id
  editedText.value = todo.text
}

// 保存编辑
const saveEdit = () => {
  if (editedText.value.trim() === '') return
  
  const todo = todos.value.find(todo => todo.id === editingId.value)
  if (todo) {
    todo.text = editedText.value.trim()
  }
  
  editingId.value = null
  editedText.value = ''
  saveTodos()
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editedText.value = ''
}

// 过滤后的 todos
const filteredTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter(todo => !todo.completed)
  } else if (filter.value === 'completed') {
    return todos.value.filter(todo => todo.completed)
  }
  return todos.value
})

// 统计信息
const activeCount = computed(() => todos.value.filter(todo => !todo.completed).length)
const completedCount = computed(() => todos.value.filter(todo => todo.completed).length)
const totalCount = computed(() => todos.value.length)

// 清除已完成的 todos
const clearCompleted = () => {
  todos.value = todos.value.filter(todo => !todo.completed)
  saveTodos()
}

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    addTodo()
  }
}

const handleEditKeyDown = (e) => {
  if (e.key === 'Enter') {
    saveEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}
</script>

<template>
  <div class="app-container">
    <div class="todo-app">
      <!-- Header -->
      <header class="todo-header">
        <h1>✨ Vue3 Todo List</h1>
        <p>Organize your tasks with style and functionality</p>
      </header>

      <!-- Add Todo Form -->
      <div class="add-todo-section">
        <input
          v-model="newTodo"
          @keydown="handleKeyDown"
          type="text"
          placeholder="What needs to be done?"
          class="todo-input"
          :class="{ 'has-content': newTodo.trim() !== '' }"
        />
        <button @click="addTodo" class="add-btn">Add Task</button>
      </div>

      <!-- Todo List -->
      <div class="todo-list-container">
        <transition-group name="list" tag="ul" class="todo-list">
          <li
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="todo-item"
            :class="{ 'completed': todo.completed, 'editing': editingId === todo.id }"
          >
            <div class="todo-content" v-if="editingId !== todo.id">
              <input
                type="checkbox"
                :checked="todo.completed"
                @change="toggleTodo(todo.id)"
                class="todo-checkbox"
              />
              <span
                class="todo-text"
                @dblclick="startEditing(todo)"
                :class="{ 'completed-text': todo.completed }"
              >
                {{ todo.text }}
              </span>
              <button
                @click="deleteTodo(todo.id)"
                class="delete-btn"
                title="Delete todo"
              >
                ✕
              </button>
            </div>
            
            <!-- Edit Mode -->
            <div v-else class="todo-edit">
              <input
                v-model="editedText"
                @keydown="handleEditKeyDown"
                type="text"
                class="edit-input"
                autofocus
              />
              <div class="edit-actions">
                <button @click="saveEdit" class="save-btn">✓</button>
                <button @click="cancelEdit" class="cancel-btn">✕</button>
              </div>
            </div>
          </li>
        </transition-group>

        <!-- Empty State -->
        <div v-if="filteredTodos.length === 0" class="empty-state">
          <p v-if="filter.value === 'all'">No tasks yet. Add your first task!</p>
          <p v-else-if="filter.value === 'active'">No active tasks. All done! 🎉</p>
          <p v-else>No completed tasks yet.</p>
        </div>
      </div>

      <!-- Footer -->
      <footer class="todo-footer">
        <div class="stats">
          <span class="stat-count">{{ activeCount }} active</span>
          <span class="stat-count">{{ completedCount }} completed</span>
          <span class="stat-count">{{ totalCount }} total</span>
        </div>
        
        <div class="filters">
          <button
            @click="filter = 'all'"
            :class="{ active: filter === 'all' }"
            class="filter-btn"
          >
            All
          </button>
          <button
            @click="filter = 'active'"
            :class="{ active: filter === 'active' }"
            class="filter-btn"
          >
            Active
          </button>
          <button
            @click="filter = 'completed'"
            :class="{ active: filter === 'completed' }"
            class="filter-btn"
          >
            Completed
          </button>
        </div>
        
        <div class="actions">
          <button @click="clearCompleted" class="clear-btn" v-if="completedCount > 0">
            Clear Completed ({{ completedCount }})
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #4b6584, #6a11cb);
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.todo-app {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* Header Styles */
.todo-header {
  background: linear-gradient(135deg, #4b6584, #6a11cb);
  color: white;
  padding: 2rem 1.5rem;
  text-align: center;
}

.todo-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.todo-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

/* Add Todo Section */
.add-todo-section {
  padding: 1.5rem;
  display: flex;
  gap: 0.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.todo-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  background: white;
}

.todo-input:focus {
  border-color: #4b6584;
  box-shadow: 0 0 0 3px rgba(75, 101, 132, 0.2);
}

.todo-input.has-content {
  border-color: #4b6584;
}

.add-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4b6584, #6a11cb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(75, 101, 132, 0.3);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(75, 101, 132, 0.4);
}

.add-btn:active {
  transform: translateY(0);
}

/* Todo List */
.todo-list-container {
  padding: 0 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  padding: 1rem;
  margin: 0.5rem 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  position: relative;
  overflow: hidden;
}

.todo-item:hover {
  transform: translateX(5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
  border-color: #e8e8e8;
}

.todo-item.completed {
  opacity: 0.7;
  background: #f8f9fa;
}

.todo-item.editing {
  background: #f0f4ff;
  border-color: #4b6584;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.todo-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
  accent-color: #4b6584;
  transition: all 0.2s ease;
}

.todo-text {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.25rem 0;
  cursor: pointer;
  transition: all 0.2s ease;
  word-break: break-word;
  line-height: 1.4;
}

.todo-text:hover {
  color: #4b6584;
}

.todo-text.completed-text {
  text-decoration: line-through;
  color: #6c757d;
  opacity: 0.8;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: #dc3545;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: bold;
}

.delete-btn:hover {
  background: #f8d7da;
  color: #c82333;
  transform: scale(1.1);
}

/* Edit Mode */
.todo-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 2px solid #4b6584;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  background: white;
}

.edit-actions {
  display: flex;
  gap: 0.25rem;
}

.save-btn,
.cancel-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover {
  background: #218838;
  transform: scale(1.05);
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
  transform: scale(1.05);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6c757d;
  font-style: italic;
}

/* Footer */
.todo-footer {
  padding: 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-count {
  background: linear-gradient(135deg, #4b6584, #6a11cb);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(75, 101, 132, 0.2);
}

.filters {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-btn {
  padding: 0.4rem 0.8rem;
  background: #e9ecef;
  border: none;
  border-radius: 20px;
  color: #495057;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: linear-gradient(135deg, #4b6584, #6a11cb);
  color: white;
  box-shadow: 0 2px 6px rgba(75, 101, 132, 0.3);
}

.filter-btn:hover:not(.active) {
  background: #dee2e6;
}

.actions {
  text-align: center;
}

.clear-btn {
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #dc3545, #6c757d);
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.2);
}

.clear-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

/* Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.list-move {
  transition: transform 0.3s ease;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app-container {
    padding: 1rem;
  }
  
  .todo-app {
    max-width: 100%;
  }
  
  .todo-header {
    padding: 1.5rem 1rem;
  }
  
  .todo-header h1 {
    font-size: 1.8rem;
  }
  
  .add-todo-section {
    flex-direction: column;
  }
  
  .add-btn {
    width: 100%;
  }
  
  .stats {
    gap: 0.5rem;
  }
  
  .filters {
    flex-wrap: wrap;
  }
}

/* Scrollbar styling */
.todo-list-container::-webkit-scrollbar {
  width: 8px;
}

.todo-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.todo-list-container::-webkit-scrollbar-thumb {
  background: #4b6584;
  border-radius: 4px;
}

.todo-list-container::-webkit-scrollbar-thumb:hover {
  background: #6a11cb;
}
</style>