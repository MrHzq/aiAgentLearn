<script setup>
import { ref, onMounted, computed } from 'vue'

// Todo 数据结构
const todos = ref([])
const newTodo = ref('')
const editingId = ref(null)
const editText = ref('')
const filter = ref('all') // 'all', 'active', 'completed'

// 从 localStorage 加载数据
onMounted(() => {
  const saved = localStorage.getItem('todos')
  if (saved) {
    try {
      todos.value = JSON.parse(saved)
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

// 计算属性：过滤后的 todos
const filteredTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter(todo => !todo.completed)
  } else if (filter.value === 'completed') {
    return todos.value.filter(todo => todo.completed)
  }
  return todos.value
})

// 计算属性：统计信息
const stats = computed(() => {
  const total = todos.value.length
  const completed = todos.value.filter(todo => todo.completed).length
  const active = total - completed
  return { total, completed, active }
})

// 添加 todo
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
const toggleComplete = (id) => {
  const todo = todos.value.find(todo => todo.id === id)
  if (todo) {
    todo.completed = !todo.completed
    saveTodos()
  }
}

// 开始编辑
const startEdit = (todo) => {
  editingId.value = todo.id
  editText.value = todo.text
}

// 保存编辑
const saveEdit = () => {
  if (editText.value.trim() === '') return
  
  const todo = todos.value.find(todo => todo.id === editingId.value)
  if (todo) {
    todo.text = editText.value.trim()
  }
  
  editingId.value = null
  editText.value = ''
  saveTodos()
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editText.value = ''
}

// 清除已完成
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
  <div class="todo-app">
    <!-- Header -->
    <header class="app-header">
      <h1>✨ Vue3 Todo App</h1>
      <p>Simple, beautiful & persistent</p>
    </header>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stats-item">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stats-item">
        <span class="stat-value">{{ stats.active }}</span>
        <span class="stat-label">Active</span>
      </div>
      <div class="stats-item">
        <span class="stat-value">{{ stats.completed }}</span>
        <span class="stat-label">Completed</span>
      </div>
    </div>

    <!-- Add Todo Form -->
    <div class="add-form">
      <input
        v-model="newTodo"
        @keydown="handleKeyDown"
        type="text"
        placeholder="What needs to be done?"
        class="todo-input"
        autofocus
      />
      <button @click="addTodo" class="add-btn">➕ Add</button>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        :class="{ active: filter === 'all' }" 
        @click="filter = 'all'"
      >
        All
      </button>
      <button 
        :class="{ active: filter === 'active' }" 
        @click="filter = 'active'"
      >
        Active
      </button>
      <button 
        :class="{ active: filter === 'completed' }" 
        @click="filter = 'completed'"
      >
        Completed
      </button>
    </div>

    <!-- Todo List -->
    <div class="todo-list">
      <transition-group name="list" tag="ul">
        <li 
          v-for="todo in filteredTodos" 
          :key="todo.id" 
          class="todo-item"
          :class="{ completed: todo.completed }"
        >
          <div class="todo-content">
            <input 
              type="checkbox" 
              :checked="todo.completed" 
              @change="toggleComplete(todo.id)"
              class="todo-checkbox"
            />
            
            <div class="todo-text">
              <transition name="fade">
                <span v-if="editingId !== todo.id" class="todo-display">
                  {{ todo.text }}
                </span>
                <input 
                  v-else 
                  v-model="editText" 
                  @keydown="handleEditKeyDown"
                  type="text" 
                  class="todo-edit-input"
                  @blur="saveEdit"
                  ref="inputRef"
                />
              </transition>
            </div>
            
            <div class="todo-actions">
              <button 
                v-if="editingId !== todo.id" 
                @click="startEdit(todo)" 
                class="action-btn edit-btn"
                title="Edit"
              >
                ✏️
              </button>
              <button 
                v-else 
                @click="saveEdit" 
                class="action-btn save-btn"
                title="Save"
              >
                ✓
              </button>
              <button 
                v-if="editingId !== todo.id" 
                @click="deleteTodo(todo.id)" 
                class="action-btn delete-btn"
                title="Delete"
              >
                🗑️
              </button>
              <button 
                v-else 
                @click="cancelEdit" 
                class="action-btn cancel-btn"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          </div>
        </li>
      </transition-group>
    </div>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <span class="footer-text">{{ stats.active }} items left</span>
        <button @click="clearCompleted" class="clear-btn" v-if="stats.completed > 0">
          Clear Completed ({{ stats.completed }})
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.todo-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

.app-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.app-header p {
  color: rgba(255,255,255,0.9);
  font-size: 1.1rem;
}

.stats-bar {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1.5rem;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.stats-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.todo-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.todo-input:focus {
  outline: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  background: white;
}

.add-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

.add-btn:active {
  transform: translateY(0);
}

.filter-tabs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-tabs button {
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.filter-tabs button.active {
  background: rgba(255,255,255,0.4);
  transform: scale(1.05);
}

.filter-tabs button:hover:not(.active) {
  background: rgba(255,255,255,0.3);
}

.todo-list {
  background: rgba(255,255,255,0.95);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  margin-bottom: 1.5rem;
}

.todo-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  animation: fadeIn 0.4s ease-out;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: rgba(0,0,0,0.02);
}

.todo-item.completed .todo-display {
  text-decoration: line-through;
  color: #999;
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
  accent-color: #4facfe;
}

.todo-text {
  flex: 1;
  min-width: 0;
}

.todo-display {
  font-size: 1.1rem;
  word-break: break-word;
  padding: 0.25rem 0;
}

.todo-edit-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 1px solid #4facfe;
  border-radius: 4px;
  font-size: 1.1rem;
  background: rgba(79,172,254,0.1);
  outline: none;
}

.todo-edit-input:focus {
  border-color: #00f2fe;
  background: rgba(0,242,254,0.15);
}

.todo-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(0,0,0,0.1);
  transform: scale(1.1);
}

.edit-btn {
  color: #4facfe;
}

.save-btn {
  color: #00f2fe;
}

.delete-btn {
  color: #ff6b6b;
}

.cancel-btn {
  color: #6c757d;
}

.app-footer {
  text-align: center;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.95);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.footer-text {
  color: #6c757d;
  font-weight: 500;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background: rgba(255,107,107,0.1);
  color: #ff6b6b;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255,107,107,0.2);
}

/* Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .todo-app {
    padding: 1rem;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .stats-bar {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
