from flask import Flask, request, jsonify
from flask_cors import CORS
import heapq
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  

def manhattan_heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def get_neighbors(current, rows, cols):
    neighbors = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)] 
    
    for dr, dc in directions:
        new_row = current[0] + dr
        new_col = current[1] + dc
        
        if 0 <= new_row < rows and 0 <= new_col < cols:
            neighbors.append((new_row, new_col))
    
    return neighbors

def a_star_pathfind(start, end, obstacles, rows, cols):
    
    start_time = time.time()
    
    obstacle_set = set(tuple(obs) for obs in obstacles)
    
    open_set = []
    heapq.heappush(open_set, (0, start))
    
    open_set_hash = {start}
    
    came_from = {}
    
    g_score = {}
    for i in range(rows):
        for j in range(cols):
            g_score[(i, j)] = float('inf')
    g_score[start] = 0
    
    f_score = {}
    for i in range(rows):
        for j in range(cols):
            f_score[(i, j)] = float('inf')
    f_score[start] = manhattan_heuristic(start, end)
    
    nodes_explored = 0
    
    while open_set:

        current_f, current = heapq.heappop(open_set)
        open_set_hash.discard(current)
        nodes_explored += 1
        
        if current == end:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.reverse()
            
            end_time = time.time()
            computation_time = round((end_time - start_time) * 1000, 2) 
            
            logger.info(f"Path found in {computation_time}ms, explored {nodes_explored} nodes")
            return {
                'path': path,
                'distance': len(path),
                'nodes_explored': nodes_explored,
                'computation_time_ms': computation_time,
                'success': True
            }
        
        for neighbor in get_neighbors(current, rows, cols):
            if neighbor in obstacle_set:
                continue
            
            tentative_g_score = g_score[current] + 1
           
            if tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + manhattan_heuristic(neighbor, end)
                
                if neighbor not in open_set_hash:
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
                    open_set_hash.add(neighbor)
    
    end_time = time.time()
    computation_time = round((end_time - start_time) * 1000, 2)
    
    logger.info(f"No path found in {computation_time}ms, explored {nodes_explored} nodes")
    return {
        'path': [],
        'distance': 0,
        'nodes_explored': nodes_explored,
        'computation_time_ms': computation_time,
        'success': False
    }

@app.route('/api/pathfind', methods=['POST'])
def pathfind():
  
    try:
        data = request.json
        
        required_fields = ['start', 'end', 'obstacles', 'rows', 'cols']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}',
                    'success': False
                }), 400
        
        start = tuple(data['start'])
        end = tuple(data['end'])
        obstacles = data['obstacles']
        rows = data['rows']
        cols = data['cols']
        
        if not (0 <= start[0] < rows and 0 <= start[1] < cols):
            return jsonify({
                'error': 'Start position is out of bounds',
                'success': False
            }), 400
        
        if not (0 <= end[0] < rows and 0 <= end[1] < cols):
            return jsonify({
                'error': 'End position is out of bounds',
                'success': False
            }), 400
        
        if start == end:
            return jsonify({
                'path': [],
                'distance': 0,
                'nodes_explored': 0,
                'computation_time_ms': 0,
                'success': True,
                'message': 'Start and end positions are the same'
            })
        
        obstacle_set = set(tuple(obs) for obs in obstacles)
        if start in obstacle_set:
            return jsonify({
                'error': 'Start position is blocked by an obstacle',
                'success': False
            }), 400
        
        if end in obstacle_set:
            return jsonify({
                'error': 'End position is blocked by an obstacle',
                'success': False
            }), 400
        
        logger.info(f"Pathfinding request: {start} -> {end}, {len(obstacles)} obstacles, {rows}x{cols} grid")
        
        result = a_star_pathfind(start, end, obstacles, rows, cols)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in pathfinding: {str(e)}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'success': False
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Pathfinding API is running',
        'timestamp': time.time()
    })

@app.route('/api/info', methods=['GET'])
def api_info():
    return jsonify({
        'name': 'Pathfinding API',
        'version': '1.0.0',
        'algorithm': 'A* (A-star)',
        'heuristic': 'Manhattan distance',
        'endpoints': {
            '/api/pathfind': 'POST - Find shortest path between two points',
            '/api/health': 'GET - Check API health',
            '/api/info': 'GET - Get API information'
        }
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'Welcome to the Pathfinding API',
        'documentation': {
            'pathfind_endpoint': '/api/pathfind',
            'method': 'POST',
            'required_fields': {
                'start': 'Array [row, col] - Starting position',
                'end': 'Array [row, col] - Ending position', 
                'obstacles': 'Array of [row, col] arrays - Obstacle positions',
                'rows': 'Integer - Number of rows in grid',
                'cols': 'Integer - Number of columns in grid'
            },
            'example_request': {
                'start': [0, 0],
                'end': [5, 5],
                'obstacles': [[1, 1], [2, 2], [3, 3]],
                'rows': 10,
                'cols': 10
            },
            'response': {
                'path': 'Array of [row, col] arrays - The shortest path',
                'distance': 'Integer - Length of the path',
                'nodes_explored': 'Integer - Number of nodes explored',
                'computation_time_ms': 'Float - Time taken in milliseconds',
                'success': 'Boolean - Whether path was found'
            }
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': ['/api/pathfind', '/api/health', '/api/info', '/'],
        'success': False
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'error': 'Method not allowed',
        'success': False
    }), 405

if __name__ == '__main__':
    print("🚀 Starting Pathfinding API Server...")
    print("📍 API will be available at: http://localhost:5000")
    print("🔍 Available endpoints:")
    print("   - POST /api/pathfind - Main pathfinding endpoint")
    print("   - GET  /api/health   - Health check")
    print("   - GET  /api/info     - API information")
    print("   - GET  /            - API documentation")
    print("✨ Ready to find paths!")
    
    app.run(
        debug=True,
        host='0.0.0.0',  
        port=5000,
        threaded=True    
    )