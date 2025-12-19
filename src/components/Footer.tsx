import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 gradient-primary rounded-lg"></div>
              <span className="font-display font-bold text-lg">CloudBee Robotics</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Industry-level bootcamps for Autonomous Driving, AI & Robotics
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Courses</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/course/ai-bootcamp" className="hover:text-primary transition-colors">AI Bootcamp</Link></li>
              <li><Link to="/course/adas-bootcamp" className="hover:text-primary transition-colors">ADAS Bootcamp</Link></li>
              <li><Link to="/course/controls-bootcamp" className="hover:text-primary transition-colors">Controls Bootcamp</Link></li>
              <li><Link to="/course/motion-planning-bootcamp" className="hover:text-primary transition-colors">Motion Planning</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#instructors" className="hover:text-primary transition-colors">Instructors</Link></li>
              <li><Link to="/courses" className="hover:text-primary transition-colors">All Courses</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: info@cloudbeerobotics-ai.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 CloudBee Robotics. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
