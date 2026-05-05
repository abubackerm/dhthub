import { User, MapPin, Mail } from "lucide-react";

const teamMembers = [
  {
    name: "Abdullah Al-Rashid",
    role: "Chief Executive Officer",
    image: "/images/team/ceo.jpg",
    email: "ceo@dynamichub.sa",
    location: "Eastern Province, KSA",
  },
  {
    name: "Sara Al-Hamad",
    role: "Director of Operations",
    image: "/images/team/director.jpg",
    email: "operations@dynamichub.sa",
    location: "Dammam, KSA",
  },
  {
    name: "Mohammed Al-Qahtani",
    role: "Head of Technical Services",
    image: "/images/team/technical.jpg",
    email: "technical@dynamichub.sa",
    location: "Khobar, KSA",
  },
  {
    name: "Fatima Al-Otaibi",
    role: "Director of Procurement",
    image: "/images/team/procurement.jpg",
    email: "procurement@dynamichub.sa",
    location: "Jubail, KSA",
  },
];

export function AboutTeam() {
  return (
    <section className="py-24 bg-(--dht-gray-light)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="scroll-trigger text-center mb-16">
          <p className="text-(--dht-red) font-semibold uppercase tracking-wider mb-3 text-sm">
            Our Leadership
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-(--dht-dark) mb-4">
            Meet Our Team
          </h2>
          <p className="text-(--dht-gray) max-w-2xl mx-auto">
            Experienced professionals committed to delivering excellence.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 scroll-trigger">
          {teamMembers.map((member, index) => (
            <TeamMemberCard key={index} member={member} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center scroll-trigger">
          <p className="text-(--dht-gray) mb-6">
            Want to join our growing team? We're always looking for talented individuals.
          </p>
          <a
            href="mailto:careers@dynamichub.sa"
            className="inline-flex items-center gap-2 bg-(--dht-red) text-white px-8 py-3 rounded-lg font-semibold hover:bg-(--dht-red-hover) transition-colors duration-300"
          >
            <Mail className="w-5 h-5" />
            View Open Positions
          </a>
        </div>
      </div>
    </section>
  );
}

function TeamMemberCard({ member }: { member: (typeof teamMembers)[0] }) {
  return (
    <div className={`scroll-trigger bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group`}>
      {/* Image Container */}
      <div className="aspect-3/4 bg-linear-to-br from-(--dht-gray-light) to-(--dht-gray) relative overflow-hidden">
        {/* Placeholder for team member image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <User className="w-24 h-24 text-(--dht-gray)/30 group-hover:scale-110 transition-transform duration-500" />
        </div>

        {/* Red Overlay on Hover */}
        <div className="absolute inset-0 bg-(--dht-red) opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-(--dht-dark) mb-1">{member.name}</h3>
        <p className="text-(--dht-red) text-sm font-medium mb-4">{member.role}</p>

        {/* Divider */}
        <div className="w-12 h-1 bg-(--dht-red) rounded-full mb-4" />

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-(--dht-gray) text-sm">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
          <div className="flex items-center gap-2 text-(--dht-gray) text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{member.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
