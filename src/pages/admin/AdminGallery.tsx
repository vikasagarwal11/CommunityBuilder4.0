import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash, 
  Upload, 
  Calendar, 
  Heart, 
  MessageSquare,
  Check,
  X,
  Grid,
  List,
  Link as LinkIcon
} from 'lucide-react';

// Sample gallery data
const galleryImages = [
  {
    id: 1,
    title: "Morning Yoga Session",
    description: "Our sunrise yoga session at Central Park was a beautiful way to start the day!",
    date: "2025-05-15",
    image: "https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 24,
    comments: 8,
    category: "Yoga",
    event: "Morning Yoga for Moms"
  },
  {
    id: 2,
    title: "Mom & Baby Fitness Workshop",
    description: "Learning how to incorporate your little ones into your workout routine.",
    date: "2025-05-10",
    image: "https://images.pexels.com/photos/6551126/pexels-photo-6551126.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 36,
    comments: 12,
    category: "Workshop",
    event: "Mom & Baby Fitness Class"
  },
  {
    id: 3,
    title: "Weekend Park Run",
    description: "Our monthly community run was a huge success with over 30 moms participating!",
    date: "2025-05-05",
    image: "https://images.pexels.com/photos/4571321/pexels-photo-4571321.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 42,
    comments: 15,
    category: "Running",
    event: "Weekend Park Run"
  },
  {
    id: 4,
    title: "Strength Training Class",
    description: "Building strength and confidence together in our weekly training session.",
    date: "2025-04-28",
    image: "https://images.pexels.com/photos/6551061/pexels-photo-6551061.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 31,
    comments: 7,
    category: "Strength",
    event: "Postpartum Strength Training"
  },
  {
    id: 5,
    title: "Nutrition Workshop",
    description: "Learning about meal prep and healthy eating habits for busy moms.",
    date: "2025-04-20",
    image: "https://images.pexels.com/photos/6551062/pexels-photo-6551062.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 27,
    comments: 11,
    category: "Nutrition",
    event: "Nutrition Workshop for Busy Moms"
  },
  {
    id: 6,
    title: "Self-Care Sunday",
    description: "Taking time for mindfulness and relaxation in our wellness session.",
    date: "2025-04-15",
    image: "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 39,
    comments: 9,
    category: "Wellness",
    event: "Self-Care Sunday"
  },
  {
    id: 7,
    title: "Beach Bootcamp",
    description: "Getting sandy and fit with our beach workout challenge!",
    date: "2025-04-10",
    image: "https://images.pexels.com/photos/4662438/pexels-photo-4662438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 45,
    comments: 16,
    category: "Bootcamp",
    event: "Summer Bootcamp Challenge"
  },
  {
    id: 8,
    title: "Postpartum Recovery Class",
    description: "Specialized exercises for new moms focusing on safe, effective recovery.",
    date: "2025-04-05",
    image: "https://images.pexels.com/photos/6551050/pexels-photo-6551050.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    likes: 33,
    comments: 14,
    category: "Postpartum",
    event: "Postpartum Recovery Workshop"
  }
];

const categories = ["All", "Yoga", "Running", "Strength", "Nutrition", "Wellness", "Workshop", "Bootcamp", "Postpartum"];

const AdminGallery = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // grid, list, or select
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState(""); // delete, download, etc.
  
  const filteredImages = galleryImages.filter(image => {
    const matchesSearch = image.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         image.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || image.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const handleSelectImage = (id: number) => {
    if (selectedImages.includes(id)) {
      setSelectedImages(selectedImages.filter(imageId => imageId !== id));
    } else {
      setSelectedImages([...selectedImages, id]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(image => image.id));
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Gallery Management</h1>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Upload Images
          </button>
          {viewMode !== 'select' ? (
            <button 
              className="px-3 py-2 bg-neutral-100 rounded-lg text-neutral-700 hover:bg-neutral-200"
              onClick={() => setViewMode('select')}
            >
              Select
            </button>
          ) : (
            <>
              <button 
                className="px-3 py-2 bg-neutral-100 rounded-lg text-neutral-700 hover:bg-neutral-200"
                onClick={() => {
                  setViewMode('grid');
                  setSelectedImages([]);
                }}
              >
                Cancel
              </button>
              <button 
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedImages.length === 0}
              >
                Delete Selected
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
            <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button 
                key={category}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* View Toggle and Selection Info */}
      <div className="flex justify-between items-center mb-6">
        {viewMode === 'select' ? (
          <div className="flex items-center">
            <button 
              className="flex items-center text-neutral-700 hover:text-primary-500 mr-4"
              onClick={handleSelectAll}
            >
              {selectedImages.length === filteredImages.length ? (
                <>
                  <X className="mr-1 h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Select All
                </>
              )}
            </button>
            <p className="text-neutral-500">
              Selected {selectedImages.length} of {filteredImages.length} images
            </p>
          </div>
        ) : (
          <p className="text-neutral-500">Showing {filteredImages.length} images</p>
        )}
        
        {viewMode !== 'select' && (
          <div className="flex items-center space-x-2">
            <button 
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button 
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        )}
      </div>
      
      {/* Gallery Display */}
      {(viewMode === 'grid' || viewMode === 'select') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div 
              key={image.id} 
              className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                viewMode === 'select' ? 'cursor-pointer relative' : ''
              }`}
              onClick={() => viewMode === 'select' && handleSelectImage(image.id)}
            >
              {viewMode === 'select' && (
                <div className={`absolute top-2 right-2 h-5 w-5 rounded-full border ${
                  selectedImages.includes(image.id) 
                    ? 'bg-primary-500 border-primary-500' 
                    : 'bg-white border-neutral-300'
                } z-10 flex items-center justify-center`}>
                  {selectedImages.includes(image.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              )}
              <div className="aspect-square overflow-hidden">
                <img 
                  src={image.image} 
                  alt={image.title} 
                  className={`w-full h-full object-cover transition-all ${
                    viewMode === 'select' && selectedImages.includes(image.id) 
                      ? 'opacity-75' 
                      : 'hover:scale-105'
                  }`}
                />
              </div>
              {viewMode !== 'select' && (
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{image.title}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{new Date(image.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        {image.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {image.comments}
                      </span>
                    </div>
                  </div>
                  <div className="flex mt-3 gap-1">
                    <button className="p-1 text-neutral-500 hover:text-primary-500 rounded">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-neutral-500 hover:text-primary-500 rounded">
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-neutral-500 hover:text-primary-500 rounded">
                      <Upload className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-neutral-500 hover:text-red-500 rounded ml-auto">
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                <th className="px-6 py-3 font-medium">Image</th>
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Engagement</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredImages.map((image, index) => (
                <tr 
                  key={image.id} 
                  className={`border-t border-neutral-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="h-12 w-12 rounded-lg overflow-hidden">
                      <img 
                        src={image.image} 
                        alt={image.title} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{image.title}</p>
                    <p className="text-xs text-neutral-500 line-clamp-1">{image.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                      {image.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{image.event}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">
                      {new Date(image.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-1 text-neutral-400" />
                        {image.likes}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1 text-neutral-400" />
                        {image.comments}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-neutral-500 hover:text-primary-500">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-neutral-500 hover:text-primary-500">
                        <LinkIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-neutral-500 hover:text-red-500">
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {filteredImages.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <p className="text-neutral-500 text-lg">No images found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;